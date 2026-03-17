# Use Node.js for building and serving
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all source files
COPY . .

# Expose the port Astro server will run on
EXPOSE 4321

# Start Astro server
CMD ["npm", "start"]