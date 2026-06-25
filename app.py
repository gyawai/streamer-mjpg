#!/usr/bin/python3

import sys, os, subprocess
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
import config as conf
from flask import Flask, render_template, send_from_directory, Response

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html",
                           streamer=f"http://{conf.my_ip}:8080")

@app.route("/control/<path:cmd>/<path:val>")
def control(cmd, val):
    msg = f"cmd:{cmd}  val:{val}"
    print(msg)
    if cmd == "shutdown":
        subprocess.run(["/usr/bin/sudo", "/usr/sbin/poweroff"])
    elif cmd == "reset":
        '''
        subprocess.run(["/bin/rm", "-f", conf.logfilename])
        with open(conf.logfilename, "w") as f:
            f.write("")
        '''
        subprocess.run(["/usr/bin/sudo", "/usr/bin/systemctl", "restart", "depth.service"])
    else:
        subprocess.run([f"./{cmd}.sh", val])

    return Response(msg, status=200, content_type="text/plain")

@app.route("/var/<path:fname>")
def varfiles(fname):
    # print(f'fname:{fname}')
    # print(f'fullpath:{f"{conf.approot}/var"}')
    return send_from_directory(f"{conf.approot}/var", fname)

app.run(host="0.0.0.0", port=5000)
