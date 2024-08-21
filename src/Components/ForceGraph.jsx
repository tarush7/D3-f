import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import jsonData from '../assets/flare-2.json';
import '@fortawesome/fontawesome-free/css/all.min.css'; // Import FontAwesome CSS

// Unicode for FontAwesome icons
const relationIcons = {
  "alma_mater": "\uf19d", // AcademicCapIcon (fa-graduation-cap)
  "born_in": "\uf015", // HomeIcon (fa-home)
  "has_father": "\uf183", // UserIcon (fa-male)
  "has_siblings": "\uf0c0", // UsersIcon (fa-users)
  "has_son": "\uf183", // UserIcon (fa-male)
  "has_wife": "\uf182", // UserGroupIcon (fa-female)
  "is_chief_of": "\uf19c", // BuildingOfficeIcon (fa-university)
  "is_founder_of": "\uf0c1", // IdentificationIcon (fa-link)
  "responsible_for": "\uf0e7", // ShieldExclamationIcon (fa-bolt)
  "reward_by": "\uf024", // FlagIcon (fa-flag)
  "alias": "\uf2c3", // InformationCircleIcon (fa-info-circle)
  "colour_of_eyes": "\uf06e", // EyeIcon (fa-eye)
  "colour_of_hair": "\uf06e", // EyeIcon (reuse)
  "criminal_charges": "\uf0e7", // ShieldExclamationIcon (reuse)
  "date_of_arrest": "\uf073", // CalendarIcon (fa-calendar)
  "date_of_birth": "\uf073", // CalendarIcon (reuse)
  "known_languages": "\uf0ac", // GlobeAltIcon (fa-globe)
  "nationality": "\uf024", // FlagIcon (reuse)
  "is_employee_of": "\uf19c", // BuildingOfficeIcon (reuse)
  "has_children": "\uf0c0", // UserGroupIcon (reuse)
  "lives_in": "\uf015", // HomeIcon (reuse)
  "countries_of_residence": "\uf0ac", // GlobeAltIcon (reuse)
  "title": "\uf19c", // IdentificationIcon (reuse)
  "designed_by": "\uf02d", // BookOpenIcon (fa-book)
  "travelled_to": "\uf072", // PaperAirplaneIcon (fa-plane)
  "travelled_in": "\uf072", // PaperAirplaneIcon (reuse)
  "released_on": "\uf073", // CalendarIcon (reuse)
};

const extractProfileNames = (data) => {
  return data.profile.map(person => ({ id: person.name, type: 'profile' }));
};

const extractRelations = (data, profileName) => {
  const profile = data.profile.find(person => person.name === profileName);
  if (!profile) return { nodes: [], links: [] };

  const nodes = [{ id: profile.name, type: 'profile', relation: 'profile' }];
  const links = [];

  profile.relations.forEach(relation => {
    relation.entities.forEach(entity => {
      nodes.push({ id: entity, type: 'entity', relation: relation.relation });
      links.push({ source: profile.name, target: entity, relation: relation.relation });
    });
  });

  return { nodes, links };
};

const ForceGraph = () => {
  const svgRef = useRef();
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [initialNodes, setInitialNodes] = useState(extractProfileNames(jsonData));

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
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
        )
        .on('click', (event, d) => {
          if (d.type === 'profile') {
            if (!selectedNodes.includes(d.id)) {
              setSelectedNodes([...selectedNodes, d.id]);
              setInitialNodes(initialNodes.filter(node => node.id !== d.id));
            } else {
              setSelectedNodes(selectedNodes.filter(node => node !== d.id));
              setInitialNodes([...initialNodes, { id: d.id, type: 'profile' }]);
            }
          }
        });

      node.append('circle')
        .attr('r', 10)
        .attr('fill', d => d.type === 'profile' ? 'orange' : '#69b3a2'); // Orange for profile nodes

      node.append('text')
        .attr('font-family', 'FontAwesome') // Set FontAwesome as the font
        .attr('font-size', '20px') // Font size for the icon
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .text(d => d.type === 'profile' ? '' : (relationIcons[d.relation] || '\uf128')) // Use FontAwesome icon or nothing for profile names
        .attr('fill', '#555'); // Icon color

      node.append('text')
        .attr('dy', d => d.type === 'profile' ? '.35em' : 25) // Adjust the position for profile names
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.type === 'profile' ? d.id : d.id); // Display the profile name and relation names

      simulation.nodes(allNodes).on('tick', ticked);
      simulation.force('link').links(allLinks);

      function ticked() {
        link.select('line')
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        link.select('text')
          .attr('x', d => (d.source.x + d.target.x) / 2)
          .attr('y', d => (d.source.y + d.target.y) / 2);

        node.attr('transform', d => `translate(${d.x},${d.y})`);
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
  }, [selectedNodes, initialNodes]);

  return (
    <svg ref={svgRef}></svg>
  );
};

export default ForceGraph;
