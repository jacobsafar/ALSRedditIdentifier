#!/bin/bash

# Production deployment script for ALS Patient Sentiment Monitor
# This script builds the application and starts it in production mode

echo "Starting production deployment..."

# Build the application
echo "Building the application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    
    # Start the application in production mode
    echo "Starting the application in production mode..."
    npm start
else
    echo "Build failed. Please check the error messages above."
    exit 1
fi