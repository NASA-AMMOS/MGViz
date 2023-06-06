# MMGIS Private Tools

This repository holds private add-on tools to MMGIS.

To include them, clone this repository within the core MMGIS repository at the path `/scripts/essence/`

Upon `npm start` plugin tools are automatically searched for by scanning over the directories:

-   `/scripts/essence/Tools`
-   `/scripts/essence/MMGIS-Private-Tools`

Tools from `/scripts/essence/MMGIS-Private-Tools` that have the same config.name as a public tool in `/scripts/essence/Tools` will overwrite public. This is useful for creating specialized versions off existing tools.

The tool directories from MMGIS-Private-Tools should be placed directly within `/scripts/essence/MMGIS-Private-Tools/` — not under `/scripts/essence/MMGIS-Private-Tools/MMGIS-Private-Tools/`

`/scripts/essence/MMGIS-Private-Tools` is ignored by default in the core MMGIS repository's `.gitignore` and must remain that way.

For development with MMGIS-Private-Tools included, add, commit and push separately from both `/` and `/scripts/essence/MMGIS-Private-Tools`

The core MMGIS must never depend on a private tool.

# MGViz Private Tools

## Chart Tool

The Chart Tool is a core feature of the MGViz application. It enables users to chart time series for sites and view site metadata. Visit http://localhost:8888/help for a user's guide on how to work with the Chart Tool. Options for the Chart Tool may be modified by opening the Chart/ChartTool.js script and updating options in the chartOptions variable. The neu.py service may require corresponding updates to accomodate any new values.

## Search Tool

The Search Tool is a customization of the standard Search Tool. It includes additional features for selecting, going to, and charting found sites. It allows search by distance within a specified radius of a site using the site code or location using latitude and longitude. It is also used by the Chart Tool to find and pan to sites.

## Velocities Tool

The Velocities Tool provides additional options for the Velocities layer that allows users to select the Source (Combination, JPL, SOPAC), Direction (Horizontal, Vertical), Display (All, >=20), and Exaggeration level. Options may be modified by opening the Velocities/VelocitiesTool.js script and updating options in the velocityOptions variable.