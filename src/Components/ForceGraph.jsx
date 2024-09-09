import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import rawData from '../assets/newJSON.json';
import '@fortawesome/fontawesome-free/css/all.min.css'; // Import FontAwesome CSS

// Unicode for FontAwesome icons
const relationIcons = {
  "alma_mater": "\uf19d", // Graduation cap icon
  "born_in": "\uf015", // Home icon
  "has_father": "\uf183", // Male user icon
  "has_siblings": "\uf0c0", // Users icon
  "has_son": "\uf183", // Male user icon (reuse)
  "has_wife": "\uf182", // Female user icon
  "is_chief_of": "\uf19c", // Building icon
  "is_founder_of": "\uf0c1", // Link icon
  "responsible_for": "\uf0e7", // Bolt icon
  "reward_by": "\uf024", // Flag icon
  "alias": "\uf2c3", // Information circle icon
  "colour_of_eyes": "\uf06e", // Eye icon
  "colour_of_hair": "\uf06e", // Eye icon (reuse)
  "criminal_charges": "\uf0e7", // Bolt icon (reuse)
  "date_of_arrest": "\uf073", // Calendar icon
  "date_of_birth": "\uf073", // Calendar icon (reuse)
  "known_languages": "\uf0ac", // Globe icon
  "nationality": "\uf024", // Flag icon (reuse)
  "is_employee_of": "\uf19c", // Building icon (reuse)
  "countries_of_residence": "\uf0ac", // Globe icon (reuse)
  "title": "\uf2b9", // Id badge icon
  "founded": "\uf058", // Check-circle icon
  "date_of_death": "\uf071", // Exclamation-triangle icon
  "religion": "\uf6d0", // Praying hands icon
  "has_daughter": "\uf183", // Female user icon (reuse)
  "has_mother": "\uf182", // Female user icon (reuse)
  "has_lawyer": "\uf0e3", // Gavel icon
  "influenced": "\uf005", // Star icon
  "inspired_by": "\uf005", // Star icon (reuse)
  "supporter_of": "\uf25a", // Heart icon
  "wanted_by": "\uf21e", // Crosshairs icon
  "awards": "\uf091", // Trophy icon
  "educational_qualification": "\uf19d", // Graduation cap icon (reuse)
  "gender": "\uf228", // Mars symbol (for male)
  "occupation": "\uf0b1", // Briefcase icon
  "social_media_accounts": "\uf099", // Twitter icon (example)
  "age_at_the_time_of_death": "\uf071", // Exclamation-triangle icon (reuse)
  "lives_in": "\uf015", // Home icon (reuse)
  "stateorprovinces_of_residence": "\uf0ac", // Globe icon (reuse)
};

// Preprocess the raw data to remove redundancies
const preprocessData = (data) => {
  return data.profile.map(person => {
    const uniqueRelations = {};

    person.relations.forEach(relation => {
      const key = relation.relation;
      if (uniqueRelations[key]) {
        uniqueRelations[key].entities = Array.from(new Set([...uniqueRelations[key].entities, ...relation.entities]));
        uniqueRelations[key].status = Array.from(new Set([...uniqueRelations[key].status, relation.status]));
      } else {
        uniqueRelations[key] = { ...relation };
      }
    });

    return {
      ...person,
      relations: Object.values(uniqueRelations),
    };
  });
};

const jsonData = { profile: preprocessData(rawData) };

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

  const entityRelations = {};

  profile.relations.forEach(relation => {
    relation.entities.forEach(entity => {
      if (!nodes.find(node => node.id === entity)) {
        nodes.push({ id: entity, type: 'entity', relation: relation.relation });
      }

      if (entityRelations[entity]) {
        entityRelations[entity].push(relation.relation);
      } else {
        entityRelations[entity] = [relation.relation];
      }
    });
  });

  Object.keys(entityRelations).forEach(entity => {
    links.push({
      source: profile.name,
      target: entity,
      relation: entityRelations[entity].join(', '),
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
        .force('link', d3.forceLink(links).id(d => d.id).strength(0.5).distance(400))
        .force('charge', d3.forceManyBody().strength(d => {
          if (d.type === 'profile' && selectedProfiles.length > 0) {
            return selectedProfiles.includes(d.id) ? -200 : -100;
          }
          return -30;
        }))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(30).strength(0.5));

      if (selectedProfiles.length > 0) {
        simulation
          .force('x', d3.forceX().x(d => selectedProfiles.includes(d.id) ? width / 2 : d.x).strength(d => selectedProfiles.includes(d.id) ? 0.03 : 0.01))
          .force('y', d3.forceY().y(d => selectedProfiles.includes(d.id) ? height / 2 : d.y).strength(d => selectedProfiles.includes(d.id) ? 0.03 : 0.01))
          .force('radial', d3.forceRadial(d => selectedProfiles.includes(d.id) ? 0 : Math.max(width, height) / 2, width / 2, height / 2).strength(0.05));
      }

      svg.selectAll('*').remove();

      const link = svg.selectAll('.link')
        .data(links)
        .enter().append('g')
        .attr('class', 'link');

      link.append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', 1.5);

      // Add Font Awesome arrow icon at the edge of the target node
      link.append('text')
        .attr('font-family', 'FontAwesome') // Set FontAwesome as the font
        .attr('font-size', '16px') // Adjust the size as needed
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em') // Adjust arrow positioning on the y-axis for overlap
        .text('\uf061') // Right arrow FontAwesome icon (fa-arrow-right)
        .attr('fill', '#666'); // Set the color of the arrow

      link.append('text')
        .attr('class', 'link-label')
        .attr('dy', 15)
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
        .attr('r', d => d.type === 'profile' ? 25 : 20)
        .attr('fill', d => d.type === 'profile' ? 'orange' : '#69b3a2');

      node.append('text')
        .attr('font-family', 'FontAwesome')
        .attr('font-size', '16px')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .text(d => d.type === 'profile' ? '\uf007' : (relationIcons[d.relation] || '\uf128'))
        .attr('fill', '#fff');

      node.append('text')
        .attr('dy', 35)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .text(d => d.id)
        .attr('fill', '#000');

      simulation.nodes(nodes).on('tick', ticked);
      simulation.force('link').links(links);

      function ticked() {
        link.select('line')
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        link.select('text')
          .each(function (d) {
            const arrow = d3.select(this);
            
            // Calculate direction vector
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Prevent division by zero
            if (distance === 0) return;

            const ux = dx / distance;
            const uy = dy / distance;

            // Get target node's radius (profile nodes have a larger radius)
            const targetRadius = d.target.type === 'profile' ? 25 : 20;

            // Add a slight offset to position the arrow outside the node
            const arrowOffset = 8; // Additional offset to make the arrow more visible

            // Calculate arrow position at the edge of the target node, with offset
            const x_arrow = d.target.x - ux * (targetRadius + arrowOffset);
            const y_arrow = d.target.y - uy * (targetRadius + arrowOffset);

            // Set arrow position and rotation
            arrow
              .attr('x', x_arrow)
              .attr('y', y_arrow)
              .attr('transform', `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}, ${x_arrow}, ${y_arrow})`);
          });

        link.select('.link-label')
          .attr('x', d => (d.source.x + d.target.x) / 2)
          .attr('y', d => (d.source.y + d.target.y) / 2 + 15);

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
