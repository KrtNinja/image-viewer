// @ts-check
// Проверки качества инструментами unclebob: crapper (CRAP), dryer (повторы), mutator (мутации).
// Сами инструменты написаны на Python и ставятся отдельно; в CI это делает .github/actions/unclebob.
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import { posix } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CRAP_THRESHOLD = 30
// Мутации проверяют только модульные тесты, без браузера. Мутация убита первым упавшим тестом.
export const MUTATION_TEST_COMMAND = 'node_modules/.bin/vitest run --bail=1'

/** @param {string} source */
export function relativeImports(source) {
  return [...source.matchAll(/\b(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(match => match[1])
}

/**
 * Файлы продукта, которые модульные тесты импортируют напрямую. Импорт `./x.js` ведёт к `x.ts` или `x.tsx`.
 * @param {{ path: string, source: string }[]} tests
 * @param {string[]} product
 */
export function testedFiles(tests, product) {
  const stems = new Set()
  for (const { path, source } of tests) {
    for (const specifier of relativeImports(source)) {
      stems.add(posix.join(posix.dirname(path), specifier).replace(/\.[cm]?jsx?$|\.tsx?$/, ''))
    }
  }
  return product.filter(file => stems.has(file.replace(/\.tsx?$/, '')))
}

/**
 * Кандидаты в повторы из текстового отчёта dryer: строка `DUPLICATE score=…` и два места `файл:начало-конец`.
 * @param {string} output
 */
export function duplicates(output) {
  const lines = output.split('\n')
  return lines.flatMap((line, index) => {
    const score = /^DUPLICATE score=(\S+)$/.exec(line)?.[1]
    return score ? [{ score, left: lines[index + 1]?.trim() ?? '', right: lines[index + 2]?.trim() ?? '' }] : []
  })
}

/**
 * Предупреждение GitHub: повтор виден в PR рядом с кодом, но проверку не роняет.
 * @param {{ score: string, left: string, right: string }} candidate
 */
export function annotation({ score, left, right }) {
  const [, file = left, line = '1', endLine = line] = /^(.+):(\d+)-(\d+)$/.exec(left) ?? []
  return `::warning file=${file},line=${line},endLine=${endLine},title=Повтор (dryer)::Совпадает по структуре с ${right}, score ${score}`
}

/** @param {string} output */
export function outcomes(output) {
  return {
    killed: output.match(/^KILLED /gm)?.length ?? 0,
    survived: output.match(/^SURVIVED /gm)?.length ?? 0,
  }
}

/** @type {Record<number, string>} */
const verdicts = { 0: 'все убиты', 2: 'исходные тесты упали', 3: 'есть выжившие' }

/** @param {number} code код завершения mutator */
export function verdict(code) {
  return verdicts[code] ?? `код ${code}`
}

/** @param {string} line */
function summary(line) {
  console.log(line)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`)
}

/** @param {string} command @param {string[]} args */
function run(command, args) {
  const result = spawnSync(command, args, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 2 ** 28 })
  if (result.error) throw result.error
  process.stdout.write(result.stdout)
  return { code: result.status ?? 1, output: result.stdout }
}

/** @param {string} directory */
function tracked(directory) {
  return execFileSync('git', ['ls-files', '-z', '--', directory], { encoding: 'utf8' }).split('\0').filter(Boolean)
}

function mutationFiles() {
  const product = tracked('src').filter(file => /\.tsx?$/.test(file))
  const tests = tracked('tests/unit').filter(file => /\.test\.tsx?$/.test(file))
  return testedFiles(tests.map(path => ({ path, source: readFileSync(path, 'utf8') })), product)
}

// Покрытие даёт `npm run coverage` (Vitest): crapper запускает его сам.
function crap() {
  return run('crapper', ['--threshold', String(CRAP_THRESHOLD), 'src']).code
}

// Отчёт для ревью: кандидаты в повторы не делают проверку красной. Красной её делает только сбой самого dryer.
function dry() {
  const { code, output } = run('dryer', ['src'])
  const found = duplicates(output)
  if (process.env.GITHUB_ACTIONS) found.forEach(candidate => console.log(annotation(candidate)))
  summary(`Кандидатов в повторы: ${found.length}`)
  return code
}

/** @param {string | undefined} file */
function mutate(file) {
  const files = mutationFiles()
  if (file !== undefined && !files.includes(file)) throw new Error(`Файл не импортирует ни один модульный тест: ${file}`)
  summary('| Файл | Мест | Убито | Выжило | Итог | Время, с |\n|---|---|---|---|---|---|')
  return Math.max(0, ...(file === undefined ? files : [file]).map(mutateFile))
}

// Проверяются все места мутаций файла, включая непокрытые: непокрытое место выживает.
/** @param {string} file */
function mutateFile(file) {
  const started = Date.now()
  const { code, output } = run('mutator', ['--no-coverage', '--mutate-all', '--test-command', MUTATION_TEST_COMMAND, file])
  const { killed, survived } = outcomes(output)
  const seconds = Math.round((Date.now() - started) / 1000)
  summary(`| ${file} | ${killed + survived} | ${killed} | ${survived} | ${verdict(code)} | ${seconds} |`)
  return code
}

/** @param {string | undefined} command @param {string | undefined} file */
function main(command, file) {
  process.chdir(execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim())
  switch (command) {
    case 'crap': return crap()
    case 'dry': return dry()
    case 'mutate': return mutate(file)
    // Список для заданий mutation.yml: по заданию на файл.
    case 'mutate-files': console.log(JSON.stringify(mutationFiles())); return 0
    default: throw new Error(`Неизвестная проверка: ${command}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv[2], process.argv[3]))
