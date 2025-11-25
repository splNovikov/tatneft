#!/usr/bin/env node

/**
 * Script to replace PlantUML code blocks with references to .puml files
 * 
 * Usage: node scripts/update-markdown-references.js <input.md> <output.md>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = process.argv[2] || '../docs/Phase-1-Presentation.md';
const outputFile = process.argv[3] || inputFile;

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf-8');
const lines = content.split('\n');

let result = [];
let inPlantUMLBlock = false;
let plantUMLCode = [];
let slideNumber = 0;
let diagramCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect slide number from heading
  const slideMatch = line.match(/^##\s+Слайд\s+(\d+):/);
  if (slideMatch) {
    slideNumber = parseInt(slideMatch[1], 10);
    diagramCount = 0; // Reset diagram count for new slide
  }
  
  // Start of PlantUML block
  if (line.trim().startsWith('```plantuml')) {
    inPlantUMLBlock = true;
    plantUMLCode = [];
    result.push(line); // Keep the opening ```
    continue;
  }
  
  // End of PlantUML block
  if (inPlantUMLBlock && line.trim() === '```') {
    inPlantUMLBlock = false;
    
    if (plantUMLCode.length > 0) {
      diagramCount++;
      
      // Extract diagram name from @startuml or generate one
      const codeText = plantUMLCode.join('\n');
      const startumlMatch = codeText.match(/@startuml\s+(\S+)/);
      const name = startumlMatch 
        ? startumlMatch[1].toLowerCase().replace(/[^a-z0-9]/g, '-')
        : `slide${slideNumber}-diagram${diagramCount}`;
      
      const filename = `${name}.puml`;
      
      // Replace the code block with reference
      result.push(`@plantuml:${filename}`);
      result.push('```');
    } else {
      result.push('```');
    }
    
    plantUMLCode = [];
    continue;
  }
  
  // Collect PlantUML code (but don't add to result)
  if (inPlantUMLBlock) {
    plantUMLCode.push(line);
    continue;
  }
  
  // Regular line
  result.push(line);
}

// Write output
fs.writeFileSync(outputFile, result.join('\n'), 'utf-8');
console.log(`✓ Updated ${outputFile}`);
console.log(`  Replaced PlantUML blocks with references to .puml files`);


