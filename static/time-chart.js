/*
 * loader() should supply data in the format below:
 *
 *
 * linestyle: [
 *   { name: 'legend0', color: 0, type: 0, }, // or you can say type: 'line0'
 *   { name: 'legend1', color: 3, type: 1, },
 *   { name: 'legend2', color: 1, type: 'area0', },
 *   ...
 * ]
 *
 * data: [
 *   { // 1st timestep
 *        sec: float-value,
 *        vals: [
 *            { val: float-value0, status: 'OK',  }, // 1st timestep for curve0
 *            { val: float-value1, status: 'OK',  }, // curve1
 *            { val: float-value2, status: 'OK recovered',  }, // curver2
 *            { val: float-value3, status: 'NG could not recovered',  }, // curce3
 *            ...
 *        ],
 *   },
 *   { // 2nd timestep
 *       ...
 *   },
 *   ....
 * ]
 */

"use strict";

/*
 * prerequisites: d3.js, chart.js
 */

const TimeChart = function(containerstr, params) {
    // default params
    this.interval = 10 * 60000; // 10min
    this.title = '';
    this.fontsize0 = "9px";
    this.fontsize1 = "9px";
    this.fontsize2 = "11px";
    this.xformat = '.1f';
    this.yformat = '.0f';
    this.timer_id = null;
    this.transduration = 1000;
    this.xdomain = null;
    this.ydomain = null;
    this.xmax_default = 60;
    this.ymax_default = 3;
    Chart.call(this, containerstr, params);
    this.containerstr = containerstr;
    this.container.className += " time-chart";
    for (let key in params) {
        this[key] = params[key];
    }
    this.ymax_prev = 0;
};

TimeChart.prototype = Object.create(Chart.prototype);
let prototype = {
    constructor: TimeChart,

    init: async function() {
        const tp = this;
        // initial plot
        await tp.new_plot();

        // kick out the replot timer
        tp.timer_id = setTimeout(this.update_plot, 0, this);
    },

    destroy: function() {
        const tp = this;
        clearTimeout(tp.timer_id);
    },
    
    load_data: function() {
        const tp = this;
        let promise = this.loader().then(function(res){
	    // console.log('res:', res);
	    tp.data = [];
	    tp.linestyle = [];
	    if (!res) return;
            if (res.data.length == 0) return;

            tp.linestyle = res.linestyle;
            tp.data = res.data;
            tp.nplots = tp.data.reduce(function(maxlen, d) {
                return d.vals.length > maxlen ? d.vals.length : maxlen;
            }, 0);

	    /*
	     * xdomain changes adaptively to cover all data.
	     */
	    const x0 = tp.data[0].sec;
	    let x1 = tp.data[tp.data.length-1].sec;
	    if (x1 < tp.xmax_default) x1 = tp.xmax_default;
	    tp.xdomain = [ x0, x1, ];

	    /*
	     * ydomain[0] is fixed to 0.
	     * ydomain[1] changes adaptively.
	     */
	    tp.ydomain = [0, 0];
            let ymax = -Infinity;
            for (let line of tp.data) {
                for (let sample of line.vals) {
                    let val = sample.val;
                    if (ymax < val) ymax = val;
                }
            }
            tp.ydomain[1] = Math.max(tp.ymax_default, tp.ymax_prev, ymax);
	    tp.ymax_prev = ymax;
	    
            // add some margin to ydomain.
            let ymid = (tp.ydomain[1] + tp.ydomain[0]) * 0.5;
            let dy = (tp.ydomain[1] - ymid) * 1.05; // 2.5% margin (= 0.5 * 1.05 + 0.5)
            tp.ydomain[0] = ymid - dy;
            tp.ydomain[1] = ymid + dy;
	    // console.log('xdomain:', tp.xdomain);
	    // console.log('prev:', tp.ymax_prev, ' ymax:', ymax, ' y1:', tp.ydomain[1]);
        });
        return promise;
    },

    update_plot: async function(tp) {
        // update_plot is invoked by setTimeout() so here in this
        // context 'this' does not points to Timeplot instance but window obj.
        // Use 'tp' to refer to the instance.
        await tp.load_data();
        tp.d3_replot();
        if (tp.timer_id) clearTimeout(tp.timer_id);
        tp.timer_id = setTimeout(tp.update_plot, tp.interval, tp);
    },


    /*
     * parse tp.linestyle[lineindex].type
     *    area1 => { type: 'area', id: '1' } // stepwise, fill the area
     *    step2 => { type: 'step', id: '2' } // stepwise, no fill
     *    3 => null  // default (plot with lines)
     */
    check_plot_style: function(lineindex) {
        const tp = this;
        let type = '' + tp.linestyle[lineindex].type;
        const m = type.match(/(\w+)(\d+)/);
        if (m) {
            return { type: m[1], id: m[2] };
        }
        return { type: 'line', id: type };
    },

    sec2minsec: function(d, i) {
	const min = parseInt(d / 60);
	const sec = parseInt(d - min * 60);
	if (min > 0) {
	    return `${min}' ${("0" + sec).slice(-2)}"`;
	}
	else {
	    return `${sec}"`;
	}
    },
    
    d3_plot: function() {
        const tp = this;
        let divid = tp.container.str;

        d3.select(divid).select("svg").remove();

        tp.container.innerHTML = '';
        if (tp.data.length === 0) {
            return;
        }
        
        let svg = d3.select(divid).append("svg")
                .attr("width", tp.width)
                .attr("height",tp.height)
                .append("g")
                .attr("class", "base")
                .attr("transform", "translate(" + tp.margin.left + ", " + tp.margin.top + ")");

	
	
        tp.scale_xy();

        tp.xaxis = d3.axisBottom()
            .scale(tp.xscale)
            .ticks(5)
	    .tickFormat(tp.sec2minsec)
            //.tickFormat(d3.format(tp.xformat))

        tp.yaxis = d3.axisLeft()
            .scale(tp.yscale)
            .ticks(3)
            .tickFormat(d3.format(tp.yformat))

        tp.area_color(svg); // a gradient color to fill an area

        // generate d3.area() or d3.line() objs
        tp.line = [];
        for (let p = 0; p < tp.nplots; p++) {
            let style = tp.check_plot_style(p);
            let ylowedge = tp.ydomain[0] - (tp.ydomain[1] - tp.ydomain[0]) * 0.01; // add bottom margin to hide the lower edge
            switch (style.type) {
            case 'area':
                tp.line[p] = d3.area()
                    .x(function(d){
                        return tp.xscale(d.sec);
                    })
                    .y1(function(d, i){
                        let sample = d.vals[p];
                        if ('yscales' in tp && tp.yscales.length > p && tp.yscales[p]) {
                            return tp.yscales[p](+sample.val);
                        }
                        else {
                            return tp.yscale(+sample.val);
                        }
                    })
                    .y0(tp.yscale(ylowedge))
                    .defined(function(d, i){
                        if (d.vals[p] === undefined) {
                            return false;
                        }
                        let val = +d.vals[p].val;
                        if (isNaN(val)) return false;
                        return true;
                    })
                    .curve(d3.curveStep)
                break;
            case 'line':
            default: // plot with line segments connecting sampled points
                tp.line[p] = d3.line()
                    .x(function(d){
                        return tp.xscale(d.sec);
                    })
                    .y(function(d, i){
                        let sample = d.vals[p];
                        if ('yscales' in tp && tp.yscales.length > p && tp.yscales[p]) {
                            return tp.yscales[p](+sample.val);
                        }
                        else {
                            return tp.yscale(+sample.val);
                        }
                    })
                    .defined(function(d, i){
                        if (d.vals[p] === undefined) {
                            return false;
                        }
                        let val = +d.vals[p].val;
                        if (isNaN(val)) return false;
                        // if (val < 0) return false;
                        return true;
                    })
                break;
            }
        }
        if (tp.nplots == 0 || tp.nodata) {
            svg.append("g")
                .append("text")
                .attr("x", tp.width0 / 2)
                .attr("y",  tp.height0 / 2)
                .style("text-anchor", "middle")
                .style("font-size", tp.fontsize2)
                .text('No data');
        }

        // title
        svg.append("g")
            .append("text")
            .attr("x", tp.width0 / 2)
            .attr("y",  0)
            .style("text-anchor", "middle")
            .style("font-size", tp.fontsize2)
            .style("text-decoration", "underline")
            .text(tp.title);

        // data plot
        let clip = (tp.containerstr + "-clip").replace(/#/, '');
        svg.append("clipPath")
            .attr("id", clip)
            .append("rect")
            // .attr("x", tp.margin.left)
            .attr("width", tp.width0 + tp.margin.left)
            .attr("x", 0)
            .attr("y", tp.margin.top)
            .attr("width", tp.width0)
            .attr("height", tp.height0);
        for (let i = tp.nplots - 1; 0 <= i; i--) {
            let id = 'line' + i;
            let d = svg.append("g")
                .attr("clip-path", "url(#" + clip + ")")
                .append("path")
                .attr("id", id)
                .attr("class", "line data-line color" + tp.linestyle[i].color + " type" + tp.linestyle[i].type)
        }

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${tp.height0 + tp.margin.top})`)
            .call(tp.xaxis)
            .selectAll("text")
            .style("font-size", tp.fontsize2)
            .style("text-anchor", "middle")
            .attr("transform", "rotate(-20)");

        svg.append("g")
            .attr("class", "y axis")
            .call(tp.yaxis)
            .selectAll("text")
            .style("font-size", tp.fontsize2);

        svg.append("g")
            .append("text")
            .style("font-size", tp.fontsize0)
            .attr("x", -tp.height0 / 2)
            .attr("y", 10)
            .attr("class", "ylabel")
            .attr("text-anchor", "left")
            .attr("transform", "rotate(-90)")
            .text(tp.ylabel)

        // legend
        for (let i = tp.nplots - 1; 0 <= i; i--) {
            let id = 'legend' + i;
            let leg = null;
            if ('legend' in tp.linestyle[i]) {
                leg = tp.linestyle[i].legend; // at position specified
            }
            else { // auto positioned
                leg = {
                    x: 10 + 40 * Math.floor(i / 6),
                    y: tp.margin.top + 14 * (i % 6) + 10,
                }
            }
            svg.append("g")
                .append("text")
                .attr("x", leg.x)
                .attr("y", leg.y)
                .attr("id", leg.id)
                .attr("class", 'legend color' + tp.linestyle[i].color)
                .style("text-anchor", "left")
                .style("font-size", tp.fontsize0)
                .text(tp.linestyle[i].name);
        }

        svg.append("g")
            .append("text")
            .style("font-size", tp.fontsize0)
            .attr("x", tp.width0 / 2.0)
            .attr("y", tp.height0 + tp.margin.top - 10)
            .attr("class", "xlabel")
            .text(tp.xlabel);

        function make_x_gridlines() {
            let line = d3.axisBottom(tp.xscale)
                .ticks(5)
                .tickSize(-tp.height0)
                .tickFormat('');
            return line;
        }

        function make_y_gridlines() {
            let line = d3.axisLeft(tp.yscale)
                .ticks(5)
                .tickSize(-tp.width0)
                .tickFormat('');
            return line;
        }

        if (tp.grid) {
            svg.append("g")
                .attr("class", "grid")
                .attr("transform", "translate(0,  " + (tp.height0 + tp.margin.top) + ")")
                .call(make_x_gridlines())
            
            svg.append("g")
                .attr("class", "grid")
                .call(make_y_gridlines())
        }        
    },

    d3_replot: function() {
        const tp = this;
        let divid = tp.container.str;
        let svg = d3.select(divid).selectAll(".base");
        if (tp.data.length === 0) return;
        tp.scale_xy();
        if (!tp.xaxis) {
            console.log('d3_replot failed. id:' + tp.containerstr);
            return -1;
        }
        tp.xaxis.scale(tp.xscale).tickFormat(tp.sec2minsec)
        tp.yaxis.scale(tp.yscale);
        svg.selectAll("g.x")
            .transition().duration(tp.transduration)
            .call(tp.xaxis)
            .selectAll("text")
            .style("font-size", tp.fontsize2)
            .style("text-anchor", "center")
            .attr("transform", "rotate(-20)");

        svg.selectAll("g.y")
            .transition().duration(tp.transduration)
            .call(tp.yaxis)
            .selectAll("text")
            .style("font-size", tp.fontsize2)

        for (let i = tp.nplots - 1; 0 <= i; i--) {
            let id = 'line' + i;
            let d = svg.selectAll("path#" + id).each(function() {
                let x1 = 0;
                d3.select(this)
                    .data([tp.data])
                    .attr("d", tp.line[i])
            })
        }

        return 0;
    },

    scale_xy: function() {
        const tp = this;
        tp.xscale = d3.scaleLinear()
            .domain(tp.xdomain)
            .range([0, tp.width0])

        tp.yscale = d3.scaleLinear()
	    .domain([tp.ydomain[0], tp.ydomain[1] * 1.05]);
	if (tp.flipy) {
	    tp.yscale = tp.yscale
		.range([tp.margin.top, tp.height0 + tp.margin.top]);
	}
	else {
	    tp.yscale = tp.yscale
		.range([tp.height0 + tp.margin.top, tp.margin.top]);
	}
    },

    // a gradient color to fill an area
    area_color: function(svg) {
        const tp = this;
        const ac = d3.rgb(tp.areacolor);
        ac.opacity = 0.7;
        const areaColorGrad = svg.append("defs")
            .append("linearGradient")
            .attr("id", "area-color")
            .attr("gradientTransform", "rotate(90)")
        
        areaColorGrad.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", ac);
            // .attr("stop-color", ac.brighter(1.5));
        areaColorGrad.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "rgba(255, 255, 255, 0)");
        return ac;
    },
}

Object.assign(TimeChart.prototype, prototype);
