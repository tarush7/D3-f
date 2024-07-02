import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import jsonData from '../assets/flare-2.json';

const extractProfileNames = (data) => {
  return data.profile.map(person => ({ id: person.name, type: 'profile' }));
};

const extractRelations = (data, profileName) => {
  const profile = data.profile.find(person => person.name === profileName);
  if (!profile) return { nodes: [], links: [] };

  const nodes = [{ id: profile.name, type: 'profile' }];
  const links = [];

  profile.relations.forEach(relation => {
    relation.entities.forEach(entity => {
      nodes.push({ id: entity, type: 'entity' });
      links.push({ source: profile.name, target: entity, relation: relation.relation });
    });
  });

  return { nodes, links };
};

const ForceGraph = () => {
  const svgRef = useRef();
  const [selectedNodes, setSelectedNodes] = useState([]);
  const initialNodes = extractProfileNames(jsonData);

  useEffect(() => {
    const width = 1600;
    const height = 1600;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('border', '1px solid black');

    const updateGraph = () => {
      const allNodes = [...initialNodes, ...selectedNodes.flatMap(node => extractRelations(jsonData, node).nodes)];
      const allLinks = selectedNodes.flatMap(node => extractRelations(jsonData, node).links);

      const simulation = d3.forceSimulation(allNodes)
        .force('link', d3.forceLink(allLinks).id(d => d.id).distance(300))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX().x(width / 2).strength(0.02))
        .force('y', d3.forceY().y(height / 2).strength(0.02))
        .force('collide', d3.forceCollide().radius(20).strength(0.7));

      svg.selectAll('*').remove();

      const link = svg.selectAll('.link')
        .data(allLinks)
        .enter().append('g')
        .attr('class', 'link');

      link.append('line')
        .style('stroke', '#999')
        .style('stroke-opacity', 0.6)
        .style('stroke-width', 1.5);

      link.append('text')
        .attr('class', 'link-label')
        .attr('dy', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.relation);

      const node = svg.selectAll('.node')
        .data(allNodes)
        .enter().append('circle')
        .attr('class', 'node')
        .attr('r', d => d.type === 'profile' ? 10 : 5) // Different sizes for profile and entity nodes
        .style('fill', d => d.type === 'profile' ? '#ff6347' : '#69b3a2') // Different colors based on type
        .on('click', (event, d) => {
          if (!selectedNodes.includes(d.id)) {
            setSelectedNodes([...selectedNodes, d.id]);
          } else {
            setSelectedNodes(selectedNodes.filter(node => node !== d.id));
          }
        })
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      const label = svg.selectAll('.label')
        .data(allNodes)
        .enter().append('text')
        .attr('class', 'label')
        .attr('dy', -10)
        .style('font-size', '10px')
        .text(d => d.id);

      simulation
        .nodes(allNodes)
        .on('tick', ticked);

      simulation.force('link')
        .links(allLinks);

      function ticked() {
        link.select('line')
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        link.select('text')
          .attr('x', d => (d.source.x + d.target.x) / 2)
          .attr('y', d => (d.source.y + d.target.y) / 2);

        node
          .attr('cx', d => d.x = Math.max(10, Math.min(width -  5, d.x)))
          .attr('cy', d => d.y = Math.max(10, Math.min(height - 5, d.y)));

        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      }

      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    };

    updateGraph();

  }, [selectedNodes]);

  return (
    <svg ref={svgRef}></svg>
  );
};

export default ForceGraph;
