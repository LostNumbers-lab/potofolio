import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

if (!process.stdin.isTTY) {
  console.error('대화형 터미널에서 npm run setup:busan-key를 실행하세요.');
  process.exit(1);
}
// 입력 문자와 키를 터미널 기록에 출력하지 않습니다.
const silent = new Writable({ write(_chunk, _encoding, done) { done(); } });
const input = createInterface({ input: process.stdin, output: silent, terminal: true });
console.log('부산관광안내소정보 서비스 인증키를 붙여넣고 Enter를 누르세요. (입력 숨김, Ctrl+C 취소)');
try {
  let key = (await input.question('')).trim();
  if (!key || /[\r\n"'\s]/.test(key)) throw new Error('인증키 형식을 확인하세요.');
  try { key = decodeURIComponent(key); } catch { throw new Error('인증키 인코딩을 확인하세요.'); }
  if (!/^[A-Za-z0-9+/=._-]+$/.test(key)) throw new Error('인증키 형식을 확인하세요.');
  const path = new URL('../.env', import.meta.url);
  let previous = '';
  try { previous = await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const lines = previous.split(/\r?\n/).filter(line => !/^\s*(?:export\s+)?BUSAN_TOURISM_SERVICE_KEY\s*=/.test(line));
  await writeFile(path, `${lines.join('\n').trimEnd()}\nBUSAN_TOURISM_SERVICE_KEY=${key}\n`, { mode: 0o600 });
  console.log('.env에 인증키를 저장했습니다. npm run dev로 실행하고 /report.html을 여세요.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { input.close(); }
