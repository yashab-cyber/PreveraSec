#!/bin/bash

# PreveraSec Demo Script
# Demonstrates the complete workflow of AppSpec compilation and DAST scanning

set -e

echo "🚀 PreveraSec Demo - AppSpec++ Full Grey-Box Context Compiler"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create demo directory
echo -e "\n${BLUE}📁 Setting up demo environment...${NC}"
mkdir -p demo/output

# Step 1: Compile AppSpec from OpenAPI
echo -e "\n${BLUE}🔧 Step 1: Compiling AppSpec from OpenAPI specification...${NC}"
node dist/cli.js compile \
  --openapi ./examples/sample-openapi.json \
  --config ./examples/preversec.config.json \
  --output ./demo/output/appspec.json \
  --verbose

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ AppSpec compilation successful!${NC}"
else
  echo -e "${RED}❌ AppSpec compilation failed${NC}"
  exit 1
fi

# Step 2: Validate the generated AppSpec
echo -e "\n${BLUE}🔍 Step 2: Validating generated AppSpec...${NC}"
node dist/cli.js validate ./demo/output/appspec.json --verbose

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ AppSpec validation successful!${NC}"
else
  echo -e "${YELLOW}⚠️ AppSpec validation completed with warnings${NC}"
fi

# Step 3: Display AppSpec statistics
echo -e "\n${BLUE}📊 Step 3: AppSpec Statistics${NC}"
if [ -f "./demo/output/appspec.json" ]; then
  endpoints=$(jq '.endpoints | length' ./demo/output/appspec.json)
  parameters=$(jq '.parameters | length' ./demo/output/appspec.json)
  security=$(jq '.security | length' ./demo/output/appspec.json)
  
  echo "  📍 Endpoints discovered: $endpoints"
  echo "  🔧 Parameters defined: $parameters"
  echo "  🛡️  Security schemes: $security"
fi

# Step 4: Show sample endpoints
echo -e "\n${BLUE}🔍 Step 4: Sample Endpoints${NC}"
if [ -f "./demo/output/appspec.json" ]; then
  echo "Discovered endpoints:"
  jq -r '.endpoints[] | "  \(.method) \(.path) - \(.summary // "No description")"' ./demo/output/appspec.json | head -10
fi

echo -e "\n${GREEN}✨ Demo completed successfully!${NC}"
echo -e "\n${BLUE}📝 Generated files:${NC}"
echo "  - AppSpec: ./demo/output/appspec.json"
echo -e "\n${BLUE}🔗 Next steps:${NC}"
echo "  1. Run DAST scan: node dist/cli.js scan --spec ./demo/output/appspec.json --target http://your-api.com"
echo "  2. Compare with runtime: node dist/cli.js diff --spec ./demo/output/appspec.json --runtime http://your-api.com"
echo "  3. Start monitoring server: node dist/cli.js server"
echo -e "\n${YELLOW}💡 Tip: Check the generated AppSpec file to see the comprehensive API documentation!${NC}"
