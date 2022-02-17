# MGViz - MMGIS GNSS Visualizer

**This is a fork of [MMGIS](https://github.com/NASA-AMMOS/MMGIS) (Multi-Mission Geographic Information System)
developed for the NASA MEaSUREs project “Extended Solid Earth Science ESDR System” (ESESES)**

**Project specific documentation and setup can be found here: [Missions/ESESES/README.md](Missions/ESESES/README.md)**

## MMGIS

Spatial Data Infrastructure for Planetary Missions

## Features

- Web-based mapping interface
- Slippy map
- 3D globe with tiled height data
- Image viewer capable of showing mosaics with targets
- Customizable layers
- Multiuser vector drawing
- Elevation profiler
- And more...

## Installation

### System Requirements

1. Install the latest version of [Node.js v10.10+](https://nodejs.org/en/download/).

1. Install [PostgreSQL v9.6+](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)
1. And do so with the [PostGIS 2.5+](https://postgis.net/install/) extension enabled.
   Agree to any possible postgis installions in the gui or run `CREATE EXTENSION postgis;` afterwards.
1. Make a new PostgreSQL database and remember the user, password and database name.

1. PHP, GDAL and Python2 are weaker dependencies (without them not everything will work)

   - PHP 5.4.16+ \* php-pdo php-mysqli pdo_sqlite modules enabled
   - GDAL 2.0.2 or 1.11.4 with Python bindings
   - Python 2.75+

   Possible commands to install them all:  
   `apt-get update`  
   `apt-get install -y php7.0-cli php-db php-sqlite3 gdal-bin libgdal-dev python-pip python-gdal`

### Setup

`/` will always refer to the repo's root directory

1. Clone the repo  
   `git clone https://github.com/NASA-AMMOS/MGViz`

1. From within `/`  
   `npm install`

1. From within `/API`  
   `npm install`

1. Run `install.sh` within `/`  
   `./install.sh`  
   (If you can't run install, just copy `/prepare/base/Missions` to `/Missions`)

1. Copy `/sample.env` to `.env`  
   `cp sample.env .env`

1. Open `.env` and update the following:

   ```
   DB_NAME=<name>
   DB_USER=<user>
   DB_PASS=<password>
   ```

1. Within `/` run `npm start`

   - If you get errors, try running `npm start` a few times. Also make sure you ran `CREATE EXTENSION postgis;` on your database.

1. Setup the admin account:

   - In your browser, navigate to `http://localhost:8888/configure`
   - Sign up for an Administrator account (The Administrator account is always the first user in the database and you are only prompted to create an Administrator account if there are no other users)

1. Now sign in with you Administrator credentials

1. Click `NEW MISSION`  
   Enter a new mission name and click `MAKE MISSION`  
   (Use the mission name `"Test"` (case-sensitive) to make the sample mission)

Go to `http://localhost:8888` to see the `Test` mission

## Documentation

Documentation pages are served at `http://localhost:8888/docs` or immediately within the `docs/pages/markdowns` directory.

## Installing with Docker

To build the Docker image, run:
`docker build -t <image tag> .`

To run MMGIS in a container, you need to create a directory on the host machine and map this to a directory in the container. On the host machine, create a `Missions` directory and copy the contents of `./Missions` to your directory. Map this directory to `/usr/src/app/Missions` in the container. For example, if the host directory is `/Missions`, launch the container with:

`docker run -v /Missions:/usr/src/app/Missions <image tag>`

If using `docker-compose`, map the volume and set all the env variables.

## License: Apache 2.0 (https://www.apache.org/licenses/LICENSE-2.0)

License Terms

Copyright (c) 2019, California Institute of Technology ("Caltech"). U.S. Government sponsorship acknowledged.

All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
- Redistributions must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- Neither the name of Caltech nor its operating division, the Jet Propulsion Laboratory, nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Contacts

Dr. Fred J. Calef III - fred.calef@jpl.nasa.gov  
Tariq K. Soliman - tariq.k.soliman@jpl.nasa.gov
Joe T. Roberts - joe.t.roberts@jpl.nasa.gov
