dc.dataGroupedTable = function(parent, chartGroup) {
    var TABLE_CSS_CLASS = "dc-table";
    var LABEL_CSS_CLASS = "dc-table-label";
    var ROW_CSS_CLASS = "dc-table-row";
    var COLUMN_CSS_CLASS = "dc-table-column";
    var GROUP_CSS_CLASS = "dc-table-group";
    var HEADER_CSS_CLASS = "dc-table-header";
    var SELECT_CSS_CLASS = "dc-table-select";

    var _chart = dc.baseChart({});

    var _size = 25;
    var _columns = [];
    var _titles = [];
    var _sortBy = function(d) {
        return d;
    };
    var _order = d3.ascending;
    var _sort = _sort = crossfilter.quicksort.by(_sortBy);
    var _nestedGroup;
    var _header;
    var _keyEvent=null;
    var _eventListenerSet=false;
    var _lastClicked=null;

    _chart.doRender = function() {
	registerKeyboardListener();
	_chart.root().attr("class",TABLE_CSS_CLASS);
	_chart.selectAll("thead").remove();
	_chart.selectAll("tbody").remove();
	renderHeader();
	renderRows(renderGroups());

        return _chart;
    };
    function renderHeader() {
	if (!_header) return;
	var headerTag = _chart.root().append("thead").append("tr")
            .attr("class", HEADER_CSS_CLASS);
	_header.forEach(function(h,i) {
		headerTag.append("td").attr("class", LABEL_CSS_CLASS + " _" + i).html(h);
	});
    }

    function renderGroups() {
        var groups = _chart.root().selectAll("tbody")
            .data(nestEntries(), function(d) {
                return _chart.keyAccessor()(d);
            });

        var rowGroup = groups
            .enter()
            .append("tbody");
	
	if (_chart.nestedGroup())
        rowGroup
            .append("tr")
            .attr("class", GROUP_CSS_CLASS)
                .append("td")
                .attr("class", LABEL_CSS_CLASS)
                .attr("colspan", _columns.length)
                .html(function(d) {
                    return _chart.keyAccessor()(d);
                })
		.on("click", innerFilter);

        groups.exit().remove();

        return rowGroup;
    }

    function nestEntries() {
        var entriesAll = _chart.group().all();
	entriesAll=entriesAll.filter(_sortBy);
	entriesAll=_sort(entriesAll, 0, entriesAll.length);
	entriesAll.reverse();
	var entries = entriesAll;

	if (_size!=Infinity) {
		entries = entriesAll.slice(0,_size);
		if (_chart.filters().length>0) 
			_chart.filters().forEach(function(d) {
				for (i=0;i<entries.length;i++)
					if (entries[i].key==d)
						return;
				for (i=0;i<entriesAll.length;i++)
					if (entriesAll[i].key==d) {
						entries.push(entriesAll[i]);
						return;
					}
			});
	}
		

	return d3.nest()
            .key(_chart.nestedGroup()?_chart.nestedGroup():function() {return false;})
            .sortKeys(_order)
            .entries(entries);
	}

    function renderRows(groups) {

        var rows = groups.order()
            .selectAll("tr." + ROW_CSS_CLASS)
            .data(function(d) {
		return d.values;
            });

        var rowEnter = rows.enter()
            .append("tr")
            .attr("class", ROW_CSS_CLASS);
	rowEnter.each(function(d) {d3.select(this).classed(SELECT_CSS_CLASS,_chart.hasFilter(d.key))});

        for (var i = 0; i < _columns.length; ++i) {
            var f = _columns[i];
            var t = _titles && _titles[i] ? _titles[i] : function() {};
            rowEnter.append("td")
		.attr("class", COLUMN_CSS_CLASS + " _" + i)
		.attr("title", t)
		.html(f)
		.on("mouseover", function() {
			d3.select(this.parentNode).classed(SELECT_CSS_CLASS,true);
		})
		.on("mouseout", function(d) {
			d3.select(this.parentNode).classed(SELECT_CSS_CLASS,_chart.hasFilter(d.key));
		})
		.on("click", innerFilter);
        }

        rows.exit().remove();

        return rows;
    }

    function registerKeyboardListener() {
	if (_eventListenerSet)
		return;
	_eventListenerSet=true;
	d3.select("body").on("keydown."+_chart.anchorName(), function(event) {
	    _keyEvent=d3.event;
	}).on("keyup."+_chart.anchorName(), function(event) {
	    _keyEvent=null;
	});
    }

    function innerFilter(sel) {
	var newsel;
	if (sel.values && sel.values instanceof Array) {
		newsel=[];
		sel.values.forEach(function(d) {
			newsel.push(d.key);
		});
	} else {
		newsel=[sel.key];
	}

	if (_keyEvent!=null && _keyEvent.shiftKey && _lastClicked!=null) {
		document.getSelection().removeAllRanges();
		var sI,lI;
		var groups = _chart.group().all();
		groups = _sort(groups, 0, groups.length);
		groups.forEach(function(d,i) {
			if (d.key==sel.key)
				sI=i;
			if (d.key==_lastClicked.key)
				lI=i;
		});
		if (sI>lI) {
			var temp=lI;
			lI=sI-1;
			sI=temp;
		} else
			sI++;
		for (i=sI;i<=lI;i++)
			newsel.push(groups[i].key);	
	}
	if (_keyEvent!=null && _keyEvent.ctrlKey) {
		_chart.filters().forEach(function(d) {
			var pos=newsel.indexOf(d);
			if (pos==-1)
				newsel.push(d);
			else if (!_keyEvent.shiftKey)
				newsel.splice(pos,1);
		});
	}

	if (newsel.length==1 && _chart.filters().length==1 && _chart.filters()[0]==newsel[0])
		newsel=[];

 	_chart.batchFilter(newsel);	
	_lastClicked=sel;
	dc.redrawAll();
    }
 
    _chart.batchFilter = function(_) {
	if (!arguments.length) return _chart.filter();

	_chart.filters().splice(0);
	if (_ instanceof Array) {
		if (_.length==0)
			_chart.filter(null);
		else {
			var last=_.pop();
			var _filters=_chart.filters();
			if (_.length>0)
				_filters.push.apply(_filters,_);
			_chart.filter(last);
		}
	} else {
		_chart.filter(_);
	}

	return _chart;
    }

    _chart.exclusiveFilter = function(_) {
	if (!arguments.length) return _chart.filter();
	
	if (!(_ instanceof Array))
		_=[_];
	var all = _chart.group().top(Infinity);
	var newfilter=[];
	all.forEach(function(d) { 
		if (_.indexOf(d.key)==-1) 
			newfilter.push(d.key); 
	});
	_chart.batchFilter(newfilter);
		
	return _chart;
    }

    _chart.nestedGroup = function(_) {
	if (!arguments.length) return _nestedGroup;
        _nestedGroup = _;
        return _chart;
    };

    _chart.header = function(_) {
	if (!arguments.length) return _nestedGroup;
        _header = _;
        return _chart;
    };

    _chart.doRedraw = function() {
        return _chart.doRender();
    };

    _chart.size = function(s) {
        if (!arguments.length) return _size;
        _size = s;
        return _chart;
    };

    _chart.columns = function(_) {
        if (!arguments.length) return _columns;
        _columns = _;
        return _chart;
    };

    _chart.titles = function(_) {
        if (!arguments.length) return _titles;
        _titles = _;
        return _chart;
    };

    _chart.sortBy = function(_) {
        if (!arguments.length) return _sortBy;
        _sortBy = _;
	_sort = crossfilter.quicksort.by(_);
        return _chart;
    };

    _chart.order = function(_) {
        if (!arguments.length) return _order;
        _order = _;
        return _chart;
    };

    return _chart.anchor(parent, chartGroup);
};
