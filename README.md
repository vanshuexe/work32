# Stressout Tours And Travel

A responsive Kashmir travel website for Stressout Tours And Travel, built with Next.js 14, Prisma, PostgreSQL (Supabase), and Supabase Storage.

## Run locally

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

Open http://localhost:3000 (and http://localhost:3000/admin for the admin content studio).

## Environment & database setup

1. Configure `.env` / `.env.local` using `.env.example` with `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and an `ADMIN_SESSION_SECRET` of at least 32 characters.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to enable admin image uploads. The service-role key is server-only; never prefix it with `NEXT_PUBLIC_`. The app automatically prepares the public `site-content` storage bucket when an image is uploaded.
3. Run `npm run db:push` to sync the Prisma schema (`SiteSettings`, `PlanCategory`, `TourPlan`, `GalleryItem`, `Location`, `SocialLink`) directly to PostgreSQL. On first load, the site automatically initializes default Kashmir tour plans, categories, hero images, gallery tiles, and locations if the database is empty.
4. Open `/admin` to manage plans, categories and card arrangement, desktop & mobile hero images, gallery images/videos, filter locations, hotel star ratings, and footer social links.

URL-encode special characters in `DATABASE_URL` passwords (for example, `@` as `%40`).

## Page features

- Sticky glass-effect navigation, with a desktop mountain-road hero and a separate mobile panorama.
- Kashmir welcome, destination, traveller, hotel, package and tour-inclusion sections.
- Client-provided package artwork and rates, with WhatsApp enquiry links.
- Contact and registration details in the trip-planning section and footer.
