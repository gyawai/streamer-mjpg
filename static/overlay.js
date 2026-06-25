"use strict";

const Interval = 0.5 * 1000; // msec
const NumDataMax = 120; // upper limit of the num of timesteps
let TC = null; // TimeChart instance

async function load_depthlog() {
    const ret = {
	linestyle: [
	    { name: '', color: 0, type: 0 },
	],
	data: [],
    };
    const res = await fetch('./var/depthlog.txt')
    if (! res.ok) { // file not loaded. plot will not update.
	console.log(`response status: ${log.status}`);
	return null;
    }
    let log = await res.text();
    log = log.split('\n');
    if (log.length < 2) return null;
    const i0 = Math.max(log.length - NumDataMax, 0);
    let lastdata = {};
    for (let i = i0; i < log.length; i += 1) {
	const m = log[i].match(/(\S+)\s+Depth\:\s+(\S+)\s+Temp\:\s+(\S+)/);
	// if (m) steps.push(`${m[1]} ${m[2]} ${m[3]}`);
	if (!m) continue;
	lastdata = {
	    sec: parseFloat(m[1]),
	    depth: parseFloat(m[2]),
	    temp: parseFloat(m[3]),
	};
	let step = {
	    sec: lastdata.sec,
	    vals: [
		{ val: lastdata.depth, status: 'OK', },
	    ],
	}
	ret.data.push(step);
    }

    // update info pane
    let elem = document.getElementById('depth-div');
    elem.textContent = `${lastdata.depth.toFixed(1)}m`;

    elem = document.getElementById('time-div');
    elem.textContent = TC.sec2minsec(lastdata.sec).replace(' ', '');
    
    elem = document.getElementById('temp-div');
    elem.textContent = `${lastdata.temp.toFixed(1)}C`;
    
    elem = document.getElementById('date-div');
    elem.textContent = date_to_string(new Date(), '%Y-%m-%d %H:%M:%S');
    
    return ret;
}

function date_to_string(date, format) {
    const monthname = ['',
                       'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
                      ];
    const dayofweekname = [
        'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
    ];

    if (!format) format = '%Y/%m/%d %H:%M:%S';
    format = format.replace(/%Y/g, date.getFullYear());
    format = format.replace(/%m/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/%d/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/%H/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/%M/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/%S/g, ('0' + date.getSeconds()).slice(-2));
    format = format.replace(/%b/g, monthname[date.getMonth() + 1]);
    format = format.replace(/%a/g, dayofweekname[date.getDay()]);
    return format;
}

function init() {
    const param = {
	loader: load_depthlog,
	// xlabel: 'dive time',
	// ylabel: 'depth',
	interval: Interval, // msec
	flipy: true,
	fontsize0: '14px',
	fontsize1: '14px',
	fontsize: '14px',
	width: 640,
	height: 192,
    };
    TC = new TimeChart('#overlay-div', param)
    TC.init();
}

document.addEventListener('DOMContentLoaded', init);
