# Stavium Follower Forest (website)

Every @stavium.ai follower gets a house in this voxel village. Search your Instagram name and the camera flies to your house.
View-only. Same village as the reels.

- `npm run dev`: local preview
- `npm run export`: re-export `public/village.json` from the reel project (`../follower-forest`), after a new day's reel
- `npm run build`: production build in `dist/`

Deploy: Cloudflare Pages (connect this GitHub repo). Build command `npm run build`, output directory `dist`.
Share link for a house: `/?u=<instagram_username>`.
