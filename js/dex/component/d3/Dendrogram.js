Dendrogram.prototype = new DexComponent();
Dendrogram.constructor = Dendrogram;

function Dendrogram(userConfig)
{
  DexComponent.call(this, userConfig,
  {
  	// The parent container of this chart.
    'parent'           : null,
    // Set these when you need to CSS style components independently.
    'id'               : 'Dendrogram',
    'class'            : 'Dendrogram',
    // Our data...
    'csv'              :
    {
    	// Give folks without data something to look at anyhow.
    	'header'         : [ "X", "Y" ],
    	'data'           : [[0,0],[1,1],[2,4],[3,9],[4,16]]
    },
    // width and height of our bar chart.
    'width'            : 600,
    'height'           : 400,
    'connection'       :
    {
      'length' : 180,
      'style'  :
      {
        'stroke' : dex.config.stroke()
      }
    },
    'xoffset'          : 20,
    'yoffset'          : 0,
    'root'             :
    {
      'name'     : "ROOT",
      'category' : "ROOT"
    },
    'color'            : d3.scale.category20(),
    'node'             :
    {
     'expanded'  :
      {
        'label'  : dex.config.label(),
        'circle' : dex.config.circle()
      },
     'collapsed' :
      {
        'label'  : dex.config.label(),
        'circle' : dex.config.circle()
      }
    },
    'link' :
    {
      'stroke'      : dex.config.stroke(),
      'fill'        : "none",
      'fillOpacity' : 1.0
    }
  });

  this.chart = this;
}

Dendrogram.prototype.render = function()
{
  this.update();
};

Dendrogram.prototype.update = function()
{
  var chart = this.chart;
  var config = this.config;
  var csv = config.csv;
  var json; 

  
  if (config.debug)
  {
    console.log("===== Dendrogram Configuration =====");
    console.dir(config);
  }
  
  var i = 0, root;

  var tree = d3.layout.tree()
    .size([config.height, config.width]);

  var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

  var chartContainer = config.parent.append("g")
    .attr("id", config["id"])
    .attr("class", config["class"])
    .attr("transform", "translate(" + config.xoffset + "," + config.yoffset + ")");

  json =
  {
    "name" : config.root.name,
    "category" : config.root.category,
    "children" : dex.csv.toHierarchicalJson(csv)
  }; 

  //dex.console.log("Dendogram JSON", json);

  root = json;
  root.x0 = config.height / 2;
  root.y0 = 0;

  function toggleAll(d)
  {
    if (d.children)
    {
      d.children.forEach(toggleAll);
      toggle(d);
    }
    else if (d.kids)
    {
      d.kids.forEach(toggleAll);
      toggle(d);
    }
  }

  // Initialize the display to show a few nodes.
  //root.kids.forEach(toggleAll);

  root = json;
  update(root);

  function update(source)
  {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse();

    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.depth * config.connection.length; });

    // Update the nodes…
    var node = chartContainer.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", function(d) { toggle(d); update(d); });

    // Come back here...
    nodeEnter.append("svg:circle")
      .each(function(d)
      {
        //dex.console.log("CALLING", this, d, i);
        var nodeConfig = (d._children) ?
          config.node.collapsed.circle : config.node.expanded.circle;
        d3.select(this).call(dex.config.configureCircle, nodeConfig);
      })
      .attr("r", 1e-6);

  // Add text nodes configured like we want them.
  nodeEnter.append("text")
    .each(function(d)
    {
      var nodeConfig = (d._children) ?
        config.node.collapsed.label : config.node.expanded.label;
      d3.select(this).call(dex.config.configureLabel, nodeConfig);
    })
    .text(function(d) { return (d.name) ? d.name : d.category;})
    .style("fill-opacity", 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.selectAll("circle")
      .each(
        function(d)
        {
          var nodeConfig = (d._children) ?
            config.node.collapsed.circle : config.node.expanded.circle;
          d3.select(this).call(dex.config.configureCircle, nodeConfig);
        });

    nodeUpdate.select("text")
      .each(
        function(d)
        {
          var nodeConfig = (d._children) ?
            config.node.collapsed.label : config.node.expanded.label;
          d3.select(this).call(dex.config.configureLabel, nodeConfig);
        })
      .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + (source.y) + "," + (source.x) + ")"; })
      .remove();

    nodeExit.select("circle")
      .attr("r", 1e-6);

    nodeExit.select("text")
      .style("fill-opacity", 1e-6);

    // Update the links…
    var link = chartContainer.selectAll("path.link")
      .data(tree.links(nodes), function(d) { return d.target.id; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("svg:path", "g")
      .attr("class", "link")
      .call(dex.config.configureStroke, config.link.stroke)
      .style("fill", config.link.fill)
      .style("fill-opacity", config.link.fillOpacity)
      .attr("d", function(d)
      {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      })
    .transition()
      .duration(duration)
      .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
      .duration(duration)
      .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d)
    {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  // Toggle children.
  function toggle(d)
  {
    if (d.children)
    {
      d._children = d.children;
      d.children = null;
    }
    else
    {
      d.children = d._children;
      d._children = null;
    }
  }
};
