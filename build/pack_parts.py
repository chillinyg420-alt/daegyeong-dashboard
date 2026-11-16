# -*- coding: utf-8 -*-
"""대시보드 자료를 '압축 → 암호화 → 분할' 형태로 저장한다.
사용: python3 pack_parts.py dash_data.json 암호파일 출력폴더(저장소)
- manifest.json : 버전·암호화 설정·조각 파일 목록(암호 없음, 자료 없음)
- d/<조각>.<해시>.bin : [IV 12바이트][AES-256-GCM 암호문]  (평문 = gzip(JSON))
"""
import sys, os, json, gzip, hashlib, glob, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

PARTS = {
    'core': ['meta', 'kpi', 'ins', 'trend', 'miss', 'tz', 'area', 'peer', 'promo'],
    'adv': ['adv'], 'bun': ['bun'], 'brd': ['brd'], 'prod': ['prod'],
}


def main(src, pwfile, out):
    D = json.load(open(src, encoding='utf-8'))
    pw = open(pwfile, encoding='utf-8').readline().strip()
    it = 200000
    salt = os.urandom(16)
    key = PBKDF2HMAC(hashes.SHA256(), 32, salt, it).derive(pw.encode())
    os.makedirs(os.path.join(out, 'd'), exist_ok=True)
    for f in glob.glob(os.path.join(out, 'd', '*.bin')):
        os.remove(f)
    man = {'v': 2, 'iter': it, 'salt': base64.b64encode(salt).decode(), 'asof': D['meta'].get('asof'), 'parts': {}}
    covered = set()
    for name, keys in PARTS.items():
        if name == 'core':
            obj = {k: D[k] for k in keys if k in D}
        else:
            obj = D[keys[0]]
        covered.update(keys)
        raw = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode()
        gz = gzip.compress(raw, 9, mtime=0)
        iv = os.urandom(12)
        blob = iv + AESGCM(key).encrypt(iv, gz, None)
        h = hashlib.sha256(blob).hexdigest()[:10]
        fn = f'd/{name}.{h}.bin'
        open(os.path.join(out, fn), 'wb').write(blob)
        man['parts'][name] = {'f': fn, 'kb': round(len(blob) / 1024)}
        print(f'{name:5s} 원본 {len(raw)//1024:5d}KB → 압축·암호화 {len(blob)//1024:5d}KB')
    missing = [k for k in D if k not in covered]
    assert not missing, f'조각에 포함되지 않은 항목: {missing}'
    json.dump(man, open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('합계', sum(p['kb'] for p in man['parts'].values()), 'KB')


if __name__ == '__main__':
    main(*sys.argv[1:4])
