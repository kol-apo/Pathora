/**
 * Load environment variables for command-line scripts, the same way Next.js
 * does: .env.local first, then .env. Values already set in the shell win.
 *
 * Import this first in any script that needs MONGODB_URI.
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ quiet: true });
