"""Agrega grabaciones a la radio propia (radio/lista.json).
Uso: python3 herramientas/radio_agregar.py "Título 1=ruta/audio1.m4a" "Título 2=ruta/audio2.mp3" ...
Cada audio se recorta (silencios al inicio y final), se empareja el volumen y se guarda
como MP3 liviano en radio/. Luego se anota su duración en radio/lista.json."""
import json, os, re, subprocess, sys, unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LISTA = os.path.join(RAIZ, 'radio', 'lista.json')

def slug(t):
    t = unicodedata.normalize('NFD', t.lower())
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:50] or 'pista'

def duracion(ruta):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', ruta], capture_output=True, text=True)
    return round(float(r.stdout.strip()), 2)

datos = json.load(open(LISTA))
for arg in sys.argv[1:]:
    titulo, origen = arg.split('=', 1)
    nombre = slug(titulo); destino = os.path.join(RAIZ, 'radio', nombre + '.mp3'); n = 2
    while os.path.exists(destino): destino = os.path.join(RAIZ, 'radio', f'{nombre}-{n}.mp3'); n += 1
    filtro = ('silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3,areverse,'
              'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.5,areverse,loudnorm=I=-16:TP=-1.5:LRA=11')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', origen, '-af', filtro, '-ac', '1', '-ar', '44100', '-b:a', '96k', destino], check=True)
    d = duracion(destino)
    datos['pistas'].append({'titulo': titulo.strip(), 'archivo': 'radio/' + os.path.basename(destino), 'duracion': d})
    print(f'+ {titulo.strip()} ({int(d // 60)}:{int(d % 60):02d}) → {os.path.basename(destino)}')
json.dump(datos, open(LISTA, 'w'), ensure_ascii=False, indent=2)
open(LISTA, 'a').write('\n')
total = sum(p['duracion'] for p in datos['pistas'])
print(f'Radio propia: {len(datos["pistas"])} pistas, {int(total // 3600)} h {int(total % 3600 // 60)} min en total.')
