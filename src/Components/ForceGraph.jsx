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

// Function to extract profiles
const extractProfileNames = (data) => {
  return data.profile.map(person => ({ id: person.name, type: 'profile' }));
};

// Function to extract relations and ensure nodes are connected
const extractRelations = (data, profileName) => {
  const profile = data.profile.find(person => person.name === profileName);
  if (!profile) return { nodes: [], links: [] };

  const nodes = [{ id: profile.name, type: 'profile', relation: 'profile' }];
  const links = [];

  profile.relations.forEach(relation => {
    relation.entities.forEach(entity => {
      // Ensure we do not duplicate nodes
      if (!nodes.find(node => node.id === entity)) {
        nodes.push({ id: entity, type: 'entity', relation: relation.relation });
      }
      links.push({ source: profile.name, target: entity, relation: relation.relation });
    });
  });

  return { nodes, links };
};

const ForceGraph = () => {
  const svgRef = useRef();
  const [selectedProfiles, setSelectedProfiles] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    const width = 1600;
    const height = 1600;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('border', '1px solid black');

    const updateGraph = () => {
      // Merge selected profiles' nodes and links into one dataset
      const { nodes, links } = selectedProfiles.reduce((acc, profile) => {
        const { nodes, links } = extractRelations(jsonData, profile);
        // Merge nodes and links, ensuring no duplicates
        nodes.forEach(node => {
          if (!acc.nodes.find(n => n.id === node.id)) {
            acc.nodes.push(node);
          }
        });
        acc.links.push(...links);
        return acc;
      }, { nodes: extractProfileNames(jsonData), links: [] });

      setGraphData({ nodes, links });

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).strength(1).distance(350))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX().x(width / 2).strength(0.02))
        .force('y', d3.forceY().y(height / 2).strength(0.02))
        .force('collide', d3.forceCollide().radius(30).strength(0.7));

      svg.selectAll('*').remove();

      const link = svg.selectAll('.link')
        .data(links)
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
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
        )
        .on('click', (event, d) => {
          if (d.type === 'profile') {
            if (!selectedProfiles.includes(d.id)) {
              setSelectedProfiles([...selectedProfiles, d.id]);
            } else {
              setSelectedProfiles(selectedProfiles.filter(profile => profile !== d.id));
            }
          }
        });

      node.append('circle')
        .attr('r', d => d.type === 'profile' ? 25 : 20) // Profile nodes larger
        .attr('fill', d => d.type === 'profile' ? 'orange' : '#69b3a2'); // Orange for profile nodes

      // Append the icon inside the node
      node.append('text')
        .attr('font-family', 'FontAwesome') // Set FontAwesome as the font
        .attr('font-size', '16px') // Font size for the icon
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em') // Center the icon within the circle
        .text(d => d.type === 'profile' ? '\uf007' : (relationIcons[d.relation] || '\uf128')) // Use FontAwesome user icon for profiles
        .attr('fill', '#fff'); // Icon color (white for better contrast inside the circle)

      // Append the relationship name next to the node
      node.append('text')
        .attr('dy', 35) // Position below the node
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.id) // Display the profile name or relation name
        .attr('fill', '#000'); // Text color

      simulation.nodes(nodes).on('tick', ticked);
      simulation.force('link').links(links);

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
  }, [selectedProfiles]);

  return (
    <svg ref={svgRef}></svg>
  );
};

export default ForceGraph;
