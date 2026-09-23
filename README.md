# Location Scout

Build a polished web application called Groundwork.

Product

Groundwork is a location intelligence tool for small businesses deciding where to open a physical store.

The user enters:

business type

candidate business location

Groundwork uses NextBillion.ai APIs to analyze the geographic characteristics around that location.

The core question is:

"What does the business landscape actually look like around this location?"

This is NOT a generic map application.

It is a focused site-selection and location due-diligence tool for small merchants.

Examples:

pharmacy

restaurant

cafe

salon

grocery store

clinic

clothing store

electronics shop

gym

convenience store

Core experience

The application should have one primary workflow:

Enter business type

Enter candidate location

Click Analyze Location

Show an interactive geographic analysis

Allow comparison of multiple candidate locations

Example:

Business:

"Coffee shop"

Location:

"Park Street, Kolkata"

The application analyzes:

nearby competing businesses

relevant nearby places

accessibility

reachable areas

competitor accessibility

surrounding business ecosystem

nearby POIs

route distances and travel times

API security

The NextBillion API key must NEVER be exposed in frontend JavaScript.

Store:

NEXTBILLION_API_KEY

as a server-side secret.

All NextBillion API calls must go through server-side functions.

Create a small server-side NextBillion client abstraction.

Do not hardcode the API key.

Main UI

Use a single-page analytical interface.

Header:

Groundwork

Subtitle:

"Understand a location before you commit to it."

Top input bar:

Business type:

[ Coffee Shop ]

Location:

[ Enter address ]

Button:

Analyze Location

Business type

Provide common presets:

Coffee Shop
Restaurant
Pharmacy
Salon
Grocery
Gym
Clinic
Retail
Hotel
Custom

Allow a custom business type.

The business type should determine which nearby place categories are relevant.

Examples:

Coffee Shop:

cafes

restaurants

hotels

offices

universities

shopping

transit

Pharmacy:

pharmacies

hospitals

clinics

diagnostic centers

residential areas

supermarkets

Restaurant:

restaurants

hotels

offices

shopping

attractions

transit

Do not hardcode exhaustive category mappings. Keep the mapping in a configuration object so it can easily be extended.

Geocoding

Use NextBillion geocoding to resolve the candidate location.

Display:

Business location
Address
Latitude
Longitude

Place a marker on the map.

If the address cannot be resolved, show a clear error and ask the user to refine the address.

Main analysis layout

Use:

LEFT:
analysis panel

RIGHT:
large interactive map

The map should occupy approximately 60% of the screen.

The analysis panel should occupy approximately 40%.

Summary

At the top of the analysis panel show:

Location Snapshot

Display:

number of relevant businesses nearby

number of direct competitors

nearest competitor

nearest relevant POI

number of relevant places within 1 km

number of relevant places within 3 km

Do not present a fabricated "overall score."

Instead show factual measurements.

Competition

Create a section:

Competition

Search for businesses relevant to the selected business type using NextBillion Places/Search APIs.

For example, if the business is a coffee shop, search for nearby cafes and coffee shops.

Show:

Competitor count
Nearest competitor
Average route distance to competitors
Nearest competitor travel time

Display competitors on the map.

Use different markers for:

YOUR LOCATION

COMPETITORS

OTHER RELEVANT PLACES

Clicking a competitor should show:

Business name
Address
Distance
Estimated travel time

Do not invent ratings, revenue, customer counts, or other information not returned by the API.

Geographic competition zones

For each nearby competitor, optionally calculate a 10-minute and 15-minute isochrone.

Visualize the reachable areas.

The map should make it possible to understand:

"How much of the same geographic market is already served by competitors?"

Do not create a single arbitrary "competition score."

Instead visualize the actual overlapping geographic areas.

Accessibility

Create:

Accessibility

Calculate actual route distances and travel times from the candidate location to relevant nearby places.

Examples:

For a cafe:

Hotels
Offices
Universities
Shopping
Transit

For a pharmacy:

Hospitals
Clinics
Diagnostic centers
Residential areas

Show:

Nearest
5 closest
10 closest

For each:

Name
Distance
Estimated travel time

Use NextBillion Directions.

Do not use straight-line distance when route distance is available.

Catchment area

Create:

Catchment

Allow the user to select:

5 min
10 min
15 min
20 min

Use NextBillion Isochrone from the candidate location.

Display the reachable polygon on the map.

This should answer:

"Where can customers realistically reach this location within X minutes?"

Allow switching between:

Driving
Motorcycle
Walking
Cycling

where supported.

Relevant-place analysis

Use NextBillion Places APIs to search for relevant categories around the candidate location.

Examples:

Coffee Shop:

offices

hotels

universities

shopping

transit

attractions

Pharmacy:

hospitals

clinics

diagnostic centers

residential

supermarkets

Restaurant:

offices

hotels

shopping

attractions

transit

Display each category as a layer that can be toggled.

Example:

[✓] Competitors
[✓] Hotels
[✓] Offices
[ ] Transit
[ ] Hospitals
[ ] Shopping

The map should update immediately.

Candidate comparison

This is an important feature.

Add:

Compare Locations

Allow the user to add up to 3 candidate locations.

Example:

Location A
Location B
Location C

For each location independently perform the same analysis.

Show a comparison table:

MetricLocation ALocation BLocation CCompetitors within 1 km493Competitors within 3 km183112Nearest competitor7 min3 min11 minRelevant POIs within 1 km32472610-min reachable area.........

Do not rank the locations as "best" or "worst."

The purpose is to let the merchant make the decision based on the underlying geographic evidence.

Map comparison

When comparing locations:

Show all candidate locations on the same map.

Allow:

A
B
C

to be toggled.

For each candidate show:

location marker

catchment polygon

competitors

relevant POIs

The user should be able to visually compare the geographic environments.

Report

Add:

Generate Location Report

Create a clean report containing:

Candidate location

Business type

Competition

Relevant nearby places

Accessibility

Catchment areas

Nearby competitor locations

Comparison with other candidates

Do not make unsupported claims such as:

"Location A will make more money."

Instead use factual language:

"Location A has 4 identified competitors within approximately 1 km, compared with 11 at Location B."

No fake intelligence

This is extremely important.

Do NOT fabricate:

revenue

customer counts

footfall

population

market size

income

business performance

ratings

probability of success

unless such information is actually available from an API.

The application should be a geographic intelligence tool, not a fake business prediction engine.

Technical implementation

Use:

React
TypeScript
Tailwind
shadcn/ui

Use an interactive map compatible with NextBillion map tiles/SDKs.

Use server-side functions for all NextBillion API requests.

Create:

nextbillion/client.ts

with functions:

geocode()
reverseGeocode()
searchPlaces()
getDirections()
getIsochrone()

Keep API-specific code isolated from UI components.

No database requirement

Do not require a database for the initial MVP.

Keep the current analysis in application state.

For candidate comparison, store candidate data in client state.

The application should be usable immediately without:

login

signup

database

payments

external CRM

analytics platform

AI

background workers

The only external service required for the geographic functionality should be NextBillion.ai.

Demo mode

Seed the interface with an example:

Business:

Coffee Shop

Location:

Park Street, Kolkata

When the application opens, show the example inputs but do not pretend the results are live unless the NextBillion API is actually configured.

If NEXTBILLION_API_KEY is unavailable, show:

"Connect your NextBillion API key to analyze live locations."

Do not fake API results.

Design

Make the application feel like a serious geographic intelligence workstation.

Reference aesthetic:

modern Bloomberg-style information density

Linear-like interface quality

clean map-first layout

restrained colors

strong typography

subtle borders

compact controls

Do NOT make it look like:

a generic SaaS landing page

an AI chatbot

a colorful consumer map app

a dashboard full of meaningless KPI cards

The map is the centerpiece.

Final user experience

The ideal flow should feel like:

User:

"I want to open a pharmacy here."

↓

Groundwork:

"Here is the geographic environment around that location."

↓

Competition:

7 pharmacies within 2 km.

Nearest competitor:
6 min driving.

↓

Relevant ecosystem:

4 clinics
2 hospitals
3 diagnostic centers
11 supermarkets

↓

Accessibility:

Most relevant locations are within 10–15 minutes.

↓

Catchment:

Show 5 / 10 / 15 minute reachable areas.

↓

User:

"What about this second location?"

↓

Groundwork:

Add Location B.

↓

Side-by-side geographic comparison.

The product should help a small merchant investigate a physical location before signing a lease, using actual geographic data rather than generic business advice.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/745d55e6-ba16-414d-b833-8aa3021b5fcb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
