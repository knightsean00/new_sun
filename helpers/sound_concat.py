import os
import argparse
from os.path import dirname, join
from scipy.io import wavfile
import scipy.io
import numpy as np

def make_dir(path):
    if os.path.isdir(path):
        pass
    else:
        os.makedirs(path)

parser = argparse.ArgumentParser(description="Concatenate sounds starting from ends.")
parser.add_argument("output_name", metavar='output_name')
parser.add_argument("server", metavar='server')

args = parser.parse_args()

data = join(os.getcwd(), 'output', args.server)
files = []

for _, __, file_names in os.walk(data):
    for f in file_names:
        if f.endswith(".wav"):
            files.append(join(data, f))
    break


audio = []
fs = 0
max_len = 0
multiple_channels = False

for f in files:
    temp_fs, to_append = wavfile.read(f)
    print(temp_fs)
    print(to_append.shape)
    fs = max(fs, temp_fs)
    audio.append(to_append)
    if (len(to_append.shape) > 1):
        multiple_channels = to_append.shape[1]
    max_len = max(to_append.shape[0], max_len)

if len(audio) > 0:
    print(f"{len(audio)} audio files found")
    if multiple_channels:
        audio = [np.pad(a, ((max_len - len(a), 0), (0, 0))) for a in audio]
    else:
        audio = [np.pad(a, (max_len - len(a), 0)) for a in audio]

    output = audio[0]
    for i in range(1, len(audio)):
        output += audio[i]

    # for c in range(multiple_channels):
    #     output[:, c] = output[:, c]/abs(output[:, c]).max()
    # print(output)

    make_dir(join(data, "saved"))
    wavfile.write(join(data, "saved", f"{args.output_name}.wav"), fs, output)

    # for f in files:
    #     os.remove(f)
else:
    print("No audio found!")


