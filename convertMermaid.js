#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Convert Mermaid diagram from Markdown to PNG
 * Usage: node convertMermaid.js input.md output.png
 */

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('❌ Usage: node convertMermaid.js <input.md> <output.png>');
  console.error('   Example: node convertMermaid.js arwad-style-flowchart.md arwad-style-flowchart.png');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];

// Validate input file exists
if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: Input file '${inputFile}' not found!`);
  process.exit(1);
}

console.log('🚀 Starting Mermaid diagram conversion...');
console.log(`📄 Input: ${inputFile}`);
console.log(`🖼️  Output: ${outputFile}`);

/**
 * Extract Mermaid code from Markdown file
 */
function extractMermaidCode(mdContent) {
  const mermaidRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
  const match = mermaidRegex.exec(mdContent);
  
  if (!match) {
    throw new Error('No Mermaid code block found in the Markdown file');
  }
  
  return match[1].trim();
}

/**
 * Main conversion process
 */
async function convertMermaidToPng() {
  try {
    // Step 1: Read Markdown file
    console.log('📖 Reading Markdown file...');
    const mdContent = fs.readFileSync(inputFile, 'utf8');
    
    // Step 2: Extract Mermaid code
    console.log('🔍 Extracting Mermaid code...');
    const mermaidCode = extractMermaidCode(mdContent);
    
    if (!mermaidCode) {
      throw new Error('Empty Mermaid code block found');
    }
    
    console.log(`✅ Found Mermaid diagram (${mermaidCode.length} characters)`);
    
    // Step 3: Save to temporary .mmd file
    const tempMmdFile = path.join(__dirname, 'temp_diagram.mmd');
    console.log('💾 Saving Mermaid code to temporary file...');
    fs.writeFileSync(tempMmdFile, mermaidCode, 'utf8');
    
    // Step 4: Generate PNG using mmdc with custom browser
    console.log('🎨 Generating PNG image...');
    const command = `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser mmdc -i "${tempMmdFile}" -o "${outputFile}" -w 1920 -H 1080`;
    
    console.log(`🔧 Running: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      // Clean up temporary file
      if (fs.existsSync(tempMmdFile)) {
        fs.unlinkSync(tempMmdFile);
      }
      
      if (error) {
        console.error('❌ Error generating PNG:', error.message);
        if (stderr) {
          console.error('Stderr:', stderr);
        }
        process.exit(1);
      }
      
      // Check if output file was created
      if (fs.existsSync(outputFile)) {
        const stats = fs.statSync(outputFile);
        console.log('✅ PNG generated successfully!');
        console.log(`📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`🖼️  Resolution: 1920x1080 pixels (16:9 aspect ratio)`);
        console.log(`🎯 Output saved as: ${outputFile}`);
        console.log('🎉 Done!');
      } else {
        console.error('❌ Error: PNG file was not created');
        process.exit(1);
      }
      
      if (stdout) {
        console.log('ℹ️  Additional output:', stdout);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Provide helpful suggestions
    if (error.message.includes('No Mermaid code block')) {
      console.error('💡 Make sure your Markdown file contains a code block like:');
      console.error('   ```mermaid');
      console.error('   graph TD');
      console.error('       A --> B');
      console.error('   ```');
    }
    
    process.exit(1);
  }
}

// Run the conversion
convertMermaidToPng();
