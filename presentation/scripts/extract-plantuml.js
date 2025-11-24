#!/usr/bin/env node

/**
 * Script to extract PlantUML diagrams from markdown file to separate .puml files
 * 
 * Usage: node scripts/extract-plantuml.js <input.md> <output-dir>
 * Example: node scripts/extract-plantuml.js ../docs/Phase-1-Presentation.md public/diagrams
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = process.argv[2];
const outputDir = process.argv[3] || 'public/diagrams';

if (!inputFile) {
  console.error('Usage: node extract-plantuml.js <input.md> [output-dir]');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

let inPlantUMLBlock = false;
let plantUMLCode = [];
let diagramName = '';
let diagramCount = 0;
let slideNumber = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect slide number from heading
  const slideMatch = line.match(/^##\s+Слайд\s+(\d+):/);
  if (slideMatch) {
    slideNumber = parseInt(slideMatch[1], 10);
  }
  
  // Start of PlantUML block
  if (line.trim().startsWith('```plantuml')) {
    inPlantUMLBlock = true;
    plantUMLCode = [];
    // Try to extract diagram name from @startuml line
    continue;
  }
  
  // End of PlantUML block
  if (inPlantUMLBlock && line.trim() === '```') {
    inPlantUMLBlock = false;
    
    if (plantUMLCode.length > 0) {
      diagramCount++;
      
      // Extract diagram name from @startuml or generate one
      const startumlMatch = plantUMLCode.join('\n').match(/@startuml\s+(\S+)/);
      const name = startumlMatch 
        ? startumlMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '-')
        : `slide${slideNumber}-diagram${diagramCount}`;
      
      const filename = `${name}.puml`;
      const filepath = path.join(outputDir, filename);
      
      // Write the PlantUML file
      fs.writeFileSync(filepath, plantUMLCode.join('\n') + '\n', 'utf-8');
      console.log(`✓ Extracted: ${filename}`);
      
      // Generate replacement reference
      const reference = `@plantuml:${filename}`;
      console.log(`  Reference: \`\`\`plantuml\n${reference}\n\`\`\``);
    }
    
    plantUMLCode = [];
    continue;
  }
  
  // Collect PlantUML code
  if (inPlantUMLBlock) {
    plantUMLCode.push(line);
  }
}

console.log(`\nExtracted ${diagramCount} PlantUML diagram(s) to ${outputDir}`);
console.log('\nTo use in markdown, replace the code blocks with:');
console.log('```plantuml');
console.log('@plantuml:filename.puml');
console.log('```');

