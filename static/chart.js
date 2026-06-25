"use strict";

const Chart = function(containerstr, params) {
    try {
        this.container = document.querySelector(containerstr);
        this.container.className += " chart";
        this.container.str = containerstr;

        // default params                                                                                                   
        this.margin = { top: 20, right: 20, bottom: 70, left: 60, };
        this.width = 480;
        this.height = 320;
        if (typeof params === 'undefined') {
            throw('Chart(container_id, param) requires param.');
        }
        for (let key in params) {
            this[key] = params[key];
        }
        let required = ['loader', ];
        for (let key of required) {
            if (!this[key]) {
                throw('Chart(container_id, param) requires param.' + key + '.');
            }
        }

        // init lets                                                                                                        
        this.width0 = this.width - this.margin.left - this.margin.right;
        this.height0 = this.height - this.margin.top - this.margin.bottom;
    }
    catch (e) {
        console.log(e);
    }
};

Chart.prototype = {
    constructor: Chart,

    set_loader: function(loader) {
        this.loader = loader;
    },

    reload_params: function(params) {
        if (typeof params !== 'undefined') {
            for (let key in params) {
                this[key] = params[key];
            }
        }
    },

    new_plot: async function(params) {
        let me = this;
        me.reload_params(params);
        await me.load_data();
        me.d3_plot();
        me.d3_replot();
    },

    reload: async function(params){
        let me = this;
        me.reload_params(params);
        await me.load_data();
        me.d3_replot();
    },
}
