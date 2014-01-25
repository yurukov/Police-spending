(function() {

var dateFormat = d3.time.format("%y%m%d");
var dateFormatL = d3.time.format("%d.%m.%Y");
var percFormat = d3.format(".1%");
var percFormatB = d3.format(".2%");
var amountFormatD = d3.format("d");
var amountFormatF = d3.format(".2f");
var amountFormatT = d3.format(",.2f");
var amountFormat = function (d) {
	if (d==0)
		return 0;
	else if (d>-1000 && d<1000)
		return amountFormatF(d);
	else if (d>-1000000 && d<1000000)
		return amountFormatD(Math.round(d));
	else if (d>-10000000 && d<10000000)
		return amountFormatF(d/1000000)+" млн.";
	else if (d>-1000000000 && d<1000000000)
		return amountFormatD(Math.round(d/1000000))+" млн.";
	else
		return amountFormatF(d/1000000000)+" млрд.";

}

eD=null;
pD=null;
rD=null;
reason=null;
cD=null;
hashBlock=false;
startDate=false;
endDate=false;
ppDateFiltered=false;
filterProcessDelay=false;
chart2all=0;

ppxf=null;
ppDate=null;
ppEntity=null;
ppReason=null;
ppDateG=null;
ppEntityG=null;
ppReasonG=null;

setTimeout(setError,5000);

function setError() {
	d3.select("#loading").html("Вероятно е станала грешка при зареждането. "+
		"Моля <a href='javascript:;' onclick='window.location.reload(true);'>презаредете</a> страницата.");
}

if (console) console.log("Loading...");

d3.csv("data/entities.csv", function (D) {
	if (D==null) setError();
	eD=D;
	init();
});

d3.csv("data/payments.csv", function (D) {
	if (D==null) setError();
	pD=D;
	init();
});

d3.tsv("data/reasons.tsv", function (D) {
	if (D==null) setError();
	rD=D;
	init();
});

function init() {
	if (!eD || !pD || !rD)
		return;
	reason=new Array();
	cD=new Array();
	startDate=false;
	endDate=false;		

	if (console) console.log("Parsing...");
	
	rD.forEach(function(d,i) {
		reason[d.code]=d;
	});

	eD.forEach(function(d,i) {
		d.shortname=d.name.substring(13);
	});


	pD.forEach(function(d,i) {
		d.date=dateFormat.parse(d.date);
		if (!startDate || startDate>d.date)
			startDate=d.date;
		if (!endDate || endDate<d.date)
			endDate=d.date;

		d.month=d3.time.month(d.date);
		d.month.setDate(15);
		d.entityid=+d.entityid;
		rD.forEach(function(h) {
			if (d[h.code]) {
				d[h.code]=+d[h.code];
				payment=new Object();
				payment.orig=i;
				payment.date=d.date;
				payment.month=d.month;
				payment.reason=h.code;				
				payment.amount=d[h.code];
				payment.entityid=d.entityid;
				cD[cD.length]=payment;
			}
		});		
	});

	startDate=d3.time.sunday(startDate);
	endDate=new Date(d3.time.sunday(endDate).getTime()+7*24*3600*1000);

	if (console) console.log("Building...");

	ppxf = crossfilter(cD);
	ppDate = ppxf.dimension(function(d) { return d.date; });
	ppDateG = ppDate.group().reduceSum(function(d) { return Math.round(d.amount); });
	ppReason = ppxf.dimension(function(d) { return d.reason; });
	ppReasonG = ppReason.group().reduceSum(function (d) { return Math.round(d.amount)});
	ppEntity = ppxf.dimension(function(d) { return +d.entityid; });
	ppEntityG = ppEntity.group().reduceSum(function (d) {return Math.round(d.amount); });

	var xf = crossfilter(cD);

// Chart 0
	var byMonth = xf.dimension(function(d) { return d.month; });
    	var byMonthGroup = byMonth.group().reduceSum(function(d) { return Math.round(d.amount); });
	var monthChart = dc.lineChart("#chart-byMonth")
		.width(680)
		.height(200)
		.margins({top: 10, right: 10, bottom: 20, left: 60})
		.dimension(byMonth)
		.group(byMonthGroup)
		.on("filtered", manageFiltered)
		.x(d3.time.scale().domain([startDate,endDate]))
	        .round(d3.time.week.round)
	        .xUnits(d3.time.weeks)
		.yAxisPadding("5%")
		.yAxis(d3.svg.axis().tickFormat(amountFormat))
		.renderHorizontalGridLines(true)
		.elasticY(true)
		.interpolate("basis")
		.renderTitle(true)
		.brushOn(true);

// Chart 1

	var byDay = xf.dimension(function(d) { return d.date; });
    	var byDayGroup = byDay.group().reduceSum(function(d) { return Math.round(d.amount); });
	dc.lineChart("#chart-byDay")
		.width(680)
		.height(200)
		.margins({top: 10, right: 10, bottom: 20, left: 60})
		.dimension(byDay)
		.group(byDayGroup)
		.rangeChart(monthChart)
		.on("filtered", manageFiltered)
		.x(d3.time.scale().domain([startDate,endDate]))
	        .round(d3.time.day.round)
	        .xUnits(d3.time.days)
		.yAxisPadding("5%")
		.yAxis(d3.svg.axis().tickFormat(amountFormat))
		.renderHorizontalGridLines(true)
		.dotRadius(8)
		.elasticY(true)
		.renderTitle(true)
		.brushOn(false)
		.title(function(d) { return "На "+dateFormatL(d.data.key)+" са похарчени "+amountFormat(d.data.value)+" лв."; })
	        .renderTitle(true);

// Chart 2

	var byReason = xf.dimension(function(d) { return d.reason; });
    	var byReasonGroup = byReason.group().reduce(
		function (p,v) { 
			chart2all+=Math.round(v.amount);
			return p+Math.round(v.amount);
		},
		function (p,v) { 
			chart2all-=Math.round(v.amount);
			return p-Math.round(v.amount);
		},
		function () { 
			chart2all=0;
			return 0;
		}
	);
        dc.pieChart("#chart-reason")
		.dimension(byReason)
		.group(byReasonGroup)
		.on("filtered", manageFiltered)
		.width(300)
		.height(240)
		.ordering(function(d) { return d.value>0?-d.value:d.value; })
		.label(function(d) { return reason[d.data.key].shortname; })
		.renderLabel(true)
		.title(function(d) { 
			return "За "+reason[d.data.key].shortname+" са платени "+amountFormat(d.data.value)+" лв. или "+
				percFormat(d.data.value/chart2all)+" от избрания бюджет"; 
		})
		.renderTitle(true);

// Chart 3
	var byReason2 = xf.dimension(function(d) { return d.reason; });
    	var byReason2Group = byReason2.group().reduceSum(function (d) { return Math.round(d.amount)});

        dc.dataGroupedTable("#chart-reasonList")
		.dimension(byReason2)
		.group(byReason2Group)
		.on("filtered", manageFiltered)
		.size(Infinity)
		.header(["Причина","Похарчени","Промяна"])
		.columns([
			function(d) { return reason[d.key].shortname; },
			function(d) { return amountFormat(d.value); },
			function(d) { 
				if (d.diff=='infinity')
					return "<span style='color:red;padding-right:18px'>∞</span>";
				if (d.diff===false || (d.diff>-0.005 && d.diff<0.005))
					return "<span style='color:gray'>-</span>";
				return d.diff>0 ? "<span style='color:red'>"+percFormat(d.diff)+"</span>" : 
						"<span style='color:green'>"+percFormat(d.diff)+"</span>";
			}])
		.titles([
			function(d) { return reason[d.key].name; },
			function(d) { return "За "+reason[d.key].shortname+" са похарчени точно "+amountFormatT(d.value)+" лв."; },
			function(d) { 
				var prev = ppReasonG.all(); 
				var prevAmount=false;
				if (ppDateFiltered)
					for (i=0;i<prev.length;i++)
						if (prev[i].key==d.key) {
							prevAmount=prev[i].value;
							break;
						}
				d.diff=false;
				if (prevAmount===false)
					return "Няма данни за година по-рано, с които да сравним. Моля изберете период след август 2013."
				if (prevAmount==0) {
					d.diff='infinity';
					return "Няма никакви плащания за '"+reason[d.key].shortname+"' година по-рано."; 
				}

				var diff = (d.value-prevAmount)/Math.abs(prevAmount);
				d.diff=diff;

				if (diff>-0.005 && diff<0.005)
					return "Практически няма промяна спрямо предишната година.";
				else if (prevAmount>0) {
					if (diff>0)
						return "Има увеличение на разходите с "+percFormatB(diff)+" спрямо предходната година. "+
							"Тогава са похарчени "+amountFormatT(prevAmount)+" лв.";
					else 
						return "Има намаление на разходите с "+percFormatB(-diff)+" спрямо предходната година. "+
							"Тогава са похарчени "+amountFormatT(prevAmount)+" лв.";
				} else{
					if (diff<0)
						return "Има увеличение на върнатите пари с "+percFormatB(-diff)+" спрямо предходната година. "+
							"Тогава са върнати "+amountFormatT(-prevAmount)+" лв.";
					else 
						return "Има намаление на разходите с "+percFormatB(diff)+" спрямо предходната година. "+
							"Тогава са върнати "+amountFormatT(-prevAmount)+" лв.";
				}
			}])
		.sortBy(function(d){ return d.value; })
		.order(d3.ascending);

// Chart 4

	var byEntity = xf.dimension(function(d) { return +d.entityid; });
    	var byEntityGroup = byEntity.group().reduceSum(function (d) {return Math.round(d.amount); });

        dc.dataGroupedTable("#chart-entityList")
		.dimension(byEntity)
		.group(byEntityGroup)
		.on("filtered", manageFiltered)
		.size(Infinity)
		.header(["Дирекция","Похарчени","Промяна"])
		.columns([
			function(d) { return eD[d.key-1].shortname; },
			function(d) { return amountFormat(d.value); },
			function(d) { 
				if (d.diff=='infinity')
					return "<span style='color:red;padding-right:18px'>∞</span>";
				if (d.diff===false || (d.diff>-0.005 && d.diff<0.005))
					return "<span style='color:gray'>-</span>";
				return d.diff*d.prevAmount>0 ? "<span style='color:red'>"+percFormat(d.diff)+"</span>" : 
						"<span style='color:green'>"+percFormat(d.diff)+"</span>";
			}])
		.titles([
			function(d) { return eD[d.key-1].name; },
			function(d) { return eD[d.key-1].shortname+" са похарчили "+amountFormatT(d.value)+" лв."; },
			function(d) { 
				var prev = ppEntityG.all(); 
				var prevAmount=false;
				if (ppDateFiltered)
					for (i=0;i<prev.length;i++)
						if (prev[i].key==d.key) {
							prevAmount=prev[i].value;
							break;
						}
				d.diff=false;
				if (prevAmount===false)
					return "Няма данни за година по-рано, с които да сравним. Моля изберете период след август 2013."
				if (prevAmount==0) {
					d.diff='infinity';
					return "Няма никакви плащания за '"+eD[d.key-1].shortname+"' година по-рано."; 
				}

				var diff = (d.value-prevAmount)/Math.abs(prevAmount);
				if (prevAmount<0) diff=-diff;
				d.diff=diff;
				d.prevAmount=prevAmount;

				if (diff>-0.005 && diff<0.005)
					return "Практически няма промяна спрямо предишната година.";
				else if (prevAmount>0) {
					if (diff>0)
						return "Има увеличение на разходите с "+percFormatB(diff)+" спрямо предходната година. "+
							"Тогава са похарчени "+amountFormatT(prevAmount)+" лв.";
					else 
						return "Има намаление на разходите с "+percFormatB(-diff)+" спрямо предходната година. "+
							"Тогава са похарчени "+amountFormatT(prevAmount)+" лв.";
				} else{
					if (diff>0)
						return "Има увеличение на върнатите пари с "+percFormatB(diff)+" спрямо предходната година. "+
							"Тогава са върнати "+amountFormatT(-prevAmount)+" лв.";
					else 
						return "Има намаление на разходите с "+percFormatB(-diff)+" спрямо предходната година. "+
							"Тогава са върнати "+amountFormatT(-prevAmount)+" лв.";
				}
			}])
		.sortBy(function(d){ return d.value; })
		.order(d3.ascending);

	if (console) console.log("Rendering...");
	dc.renderAll();

	if (console) console.log("Filtering...");
	filter(window.location.hash);

	if (console) console.log("Done. Go play.");
	d3.select("#loading").classed("hidden",true);
	d3.select("#charts").classed("hidden",false);
};

function displayText() {
	var text="";
	
	if (dc.chartRegistry.list()[1].dimension().top(Infinity).length==0)
		text="Няма плащания за този период."
	else {
		aT=0, dT="", rT="", eT="", pT="";
		var filters = [dc.chartRegistry.list()[0].filters(),
			dc.chartRegistry.list()[3].filters(),
			dc.chartRegistry.list()[4].filters()];
		dc.chartRegistry.list()[1].group().all().forEach(function(d) {
			aT+=d.value;
		});
		
		pT=" Не можем да сравним с предходната година.";
		if (ppDateFiltered) {
			var prevAmount=0;
			var origFilter = dc.chartRegistry.list()[3].filters()
			ppReasonG.all().forEach(function(d) {
				if (origFilter.indexOf(d.key)!=-1)
					prevAmount+=d.value;
			});
			if (prevAmount!=0) {
				var diff = (aT-prevAmount)/Math.abs(prevAmount);
				if (prevAmount<0) diff=-diff;
				if (diff>-0.005 && diff<0.005)
					pT=" Няма промяна спрямо предишната година.";
				else if (diff>=10)
					pT=" Това е увеличение в <b>"+amountFormatD(Math.round(diff))+" пъти</b> спрямо преведените "+
						amountFormat(prevAmount)+" лв. предходната година. ";
				else if (diff>0)
					pT=" Това е увеличение с <b>"+percFormatB(diff)+"</b> или <b>"+
						amountFormat(aT-prevAmount)+" лв.</b> спрямо предходната година. ";
				else 
					pT=" Това е намаление с <b>"+percFormatB(-diff)+"</b> или <b>"+
						amountFormat(prevAmount-aT)+" лв.</b> спрямо предходната година. ";
			} else
				pT=" Не са правени такива плащания предходната година.";
		}

		if (filters[0].length) {
			var dates = filters[0][0];
			var period = (new Date()-dates[0])/1000/3600/24;
			if (dates[1].getTime()!=endDate.getTime())
				dT=" между "+dateFormatL(dates[0])+" и "+dateFormatL(dates[1]);
			else if (period<=10)
				dT=" от последната седмица";
			else if (period<=21)
				dT=" от последните "+Math.ceil(period/7)+" седмици";
			else if (period<=31)
				dT=" от последния месец";
			else
				dT=" от "+dateFormatL(dates[0])+" до сега";
			dT+=".";
		} else {
			var period = (endDate-startDate)/1000/3600/24/30.5;
			dT=" от последните "+Math.ceil(period)+" месеца.";
		}

		if (filters[1].length) {
			if (filters[1].length==1)
				rT=" Избраната причина за плащане е '"+reason[filters[1][0]].shortname+"'.";
			else if (filters[1].length==2)
				rT=" Избраните причини за плащане са '"+reason[filters[1][0]].shortname+"' и '"+reason[filters[1][1]].shortname+"'.";
			else
				rT=" Избрани са "+filters[1].length+" причини за плащане.";
		}

		if (filters[2].length) {
			if (filters[2].length==1)
				eT=eD[filters[2][0]-1].shortname;
			else if (filters[2].length==2)
				eT=eD[filters[2][0]-1].shortname+" и "+eD[filters[2][1]-1].shortname;
			else
				eT=filters[2].length+" дирекции";
			eT=" Плащанията са направени от "+eT+".";
		}

		text+="Показани са бюджетни плащания за <b>"+amountFormat(aT)+" лв.</b>"+(aT<0?" <i>(върнати средства)</i>":"")+dT+pT+rT+eT;
	}
	d3.select("#chart-text").html(text); 
}

function manageFiltered(chart,filter) {
	var name = chart.anchorName();
	if (name=="chart-byDay") {
		if (filter==null) {
			if (dc.chartRegistry.list()[0].filter()==null) {
				ppDateFiltered=false;
				ppDate.filterAll();
			}
		} else {
			var dateF = new Date(filter[0].getFullYear()-1,filter[0].getMonth(),filter[0].getDate());
			var dateT = new Date(filter[1].getFullYear()-1,filter[1].getMonth(),filter[1].getDate());
			if (dateF>=startDate) {
				ppDateFiltered=true;
				ppDate.filter([dateF,dateT]);
			} else
				ppDateFiltered=false;
		}
	} else if (name=="chart-reasonList" || name=="chart-entityList") {
		var dim = name=="chart-reasonList"? ppReason : ppEntity;
		var filters = chart.filters();
		if (filters == null || filters.length==0) 
			dim.filterAll();
		else if (filters instanceof Array)
			dim.filterFunction(function(d) {
				return filters.indexOf(d)!=-1;
			});
		else 
			dim.filter(filters);
	}

	if (filterProcessDelay) clearTimeout(filterProcessDelay);
	filterProcessDelay=setTimeout(function() {
		hashFilters();
		displayText();
		filterProcessDelay=false;
	},500);

	if (filter!=null && (name=="chart-byDay" || name=="chart-reason")) {
		if (name=="chart-reason" && !(filter instanceof Array))
			dc.chartRegistry.list()[3].batchFilter([filter]);
		chart.filter(null);
	}
}


window.quickfilter0Reset = function() {
	dc.chartRegistry.list()[0].filterAll();
	dc.redrawAll();
}

window.quickfilter0afterAug = function() {
	var f = dc.chartRegistry.list()[0].filter();
	if (f==null)
		f=[new Date(2013,7,1), new Date(2014,6,31)]
	else {
		f[0]=new Date(2013,7,1);
		if (f[0]>=f[1]) f[1]=new Date(2014,6,31);
	}
	if (f[1]>endDate)
		f[1]=endDate;	
	dc.chartRegistry.list()[0].filterAll().filter(f);
	dc.redrawAll();
}

window.quickfilter0antimonopol = function() {
	dc.chartRegistry.list()[0].filterAll().filter([new Date(2013,0,28),new Date(2013,2,16)]);
	dc.redrawAll();
}

window.quickfilter0danswithme = function() {
	dc.chartRegistry.list()[0].filterAll().filter([new Date(2013,5,14),endDate]);
	dc.redrawAll();
}

window.quickfilter3Reset = function() {
	dc.chartRegistry.list()[3].filterAll();
	dc.redrawAll();
}

window.quickfilter4noMVR = function() {
	window.filter("&&excl,50");
	dc.redrawAll();
}

window.quickfilter4OD = function() {
	window.filter("&&excl,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,43,44,45,46,47,48,49,50");
	dc.redrawAll();
}

window.quickfilter4Reset = function() {
	dc.chartRegistry.list()[4].filterAll();
	dc.redrawAll();
}

window.reset = function() {
	filter();
};

var hashFilters = function() {
	if (hashBlock) return;
	hashBlock=true;
	window.location.hash=encodeFiltersURL(getFilters());
	hashBlock=false;
	if (document.getElementById("lang_link")) {
		var langL = document.getElementById("lang_link").href;
		if (langL.indexOf("#")!=-1)
			langL=langL.substring(0,langL.indexOf("#"));
		document.getElementById("lang_link").href=langL+window.location.hash;
	}
}
window.getFilters = function() {
	var filters=[];
	dc.chartRegistry.list().forEach(function(d, i) { 
		filters[i]=d.filters().slice(0);
		if (filters[i].length==1 && filters[i][0] instanceof Array)
			filters[i][0]=filters[i][0].slice(0);
		if (d.batchFilter) {
			var allEntries = d.dimension().group().all();
			if (allEntries.length/2-2<filters[i].length) {
				filters[i]=["excl"];
				allEntries.forEach(function(e) {
					if (d.filters().indexOf(e.key)==-1)
						filters[i].push(e.key);
				});
			}
		}
	});
	//skip non-filtered charts
	filters = [filters[0],filters[3],filters[4]];
	return filters;
};

window.encodeFiltersURL = function(filters) {
	filters = filters;
	filters.forEach(function(f, i) {
		if (!f || f.length==0)
			filters[i]='';
		else {
			if (f[0] instanceof Array)
				f=f[0];
			if (f[0] instanceof Date)
				for (j=0;j<f.length;j++)
					f[j]=dateFormat(f[j]);
			filters[i]=f.join(",");
		}
	});
	var f = filters.join("&").replace(/&+$/,"");
	if (f=="") f="&";
	return f;
};

window.decodeFiltersURL = function(hash) {
	if (hash==null || hash=="" || hash=="#" || hash=="#&")
		return null;
	if (hash[0]=="#")
		hash=hash.substr(1);
	hash=hash.split("&");
	var filters = [null,null,null];
	hash.forEach(function(h, i) {
		if (h=="")
			filters[i]=null;
		else if (i==0) {
			var parts = h.split(",");
			if (parts.length==2)
				filters[i]=[dateFormat.parse(parts[0]),dateFormat.parse(parts[1])];
			else
				filters[i]=null;
		} else {
			var parts = h.split(",");
			if (i==2) 
			for (j=0;j<parts.length;j++) 
				if (parts[j]!="excl") {
					parts[j]=parseInt(parts[j]);
					if (isNaN(parts[j])) {
						filters[i]=null;
						return;
					}
				}
			filters[i]=parts.slice(0);
		}
	});
	filters = [filters[0],null,null,filters[1],filters[2]];
	return filters;
};

window.filter = function(filters) {
	if (filters!=null && typeof filters =='string')
		filters = decodeFiltersURL(decodeURIComponent(filters));
	hashBlock=true;
	if (filters==null)
		dc.filterAll();
	else {
		dc.filterAll();
		dc.chartRegistry.list().forEach(function(d, i) { 
			if (i<filters.length) {
				if (d.batchFilter) {
					if (filters[i]!=null && filters[i][0]=="excl") {
						var oldfilter = filters[i].slice(0);
						filters[i]=[];
						d.group().all().forEach(function(d) {
							if (oldfilter.indexOf(d.key)==-1)
								filters[i].push(d.key);
						});						
					}
					d.batchFilter(filters[i]);
				} else
					d.filter(filters[i]); 
			} else
				d.filter(null); 
		});
	}
	hashBlock=false;
	hashFilters();
	dc.redrawAll();
};

})();
