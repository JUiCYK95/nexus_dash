# Nexus AI Chat History - Migration Instructions

## Overview
The Nexus AI feature has been implemented with per-user chat history functionality. To enable persistent storage of chat messages, you need to apply a database migration.

## What's Been Implemented

✅ **Completed:**
1. Changed branding from "Powered by GPT-4.1 Nano" to "Powered by Nexus Automotive"
2. No search bar in Nexus AI page (wasn't present)
3. Created database migration file for chat history table
4. Updated API route to save messages to database automatically
5. Created API route to load chat history
6. Updated chat page to load and display history from database
7. Added loading state when fetching history
8. Implemented clear chat functionality that deletes from database

## Database Migration Required

The migration file is located at:
```
supabase/migrations/20240126000000_create_nexus_ai_chat_history.sql
```

### To Apply the Migration:

**Option 1: Via Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard/project/ijbrtnxhtojmnfavhrpx/sql
2. Open the migration file: `supabase/migrations/20240126000000_create_nexus_ai_chat_history.sql`
3. Copy all its contents
4. Paste into the SQL editor in Supabase Dashboard
5. Click "Run" to execute

**Option 2: Check Migration Status**
Run the helper script:
```bash
node apply-nexus-ai-migration-direct.js
```

This will check if the table exists and provide instructions.

## Database Schema

The migration creates the following:

### Table: `nexus_ai_chat_history`
- `id` (UUID) - Primary key
- `user_id` (UUID) - References auth.users, user who sent/received the message
- `role` (TEXT) - Either 'user' or 'assistant'
- `content` (TEXT) - The message content
- `created_at` (TIMESTAMP) - When the message was created
- `updated_at` (TIMESTAMP) - Last update timestamp

### Security (RLS Policies)
- Users can only view their own chat history
- Users can only insert their own messages
- Users can only delete their own chat history

### Indexes
- Index on `user_id` for fast user-specific queries
- Index on `created_at` for chronological sorting

## Testing the Feature

1. Apply the migration (see above)
2. Navigate to `/dashboard/nexus-ai`
3. Start chatting with Nexus AI
4. Refresh the page - your chat history should persist
5. Click "Chat leeren" to clear your chat history

## API Endpoints

- `POST /api/nexus-ai/chat` - Send a message and get AI response (auto-saves to DB)
- `GET /api/nexus-ai/history` - Load chat history for current user
- `DELETE /api/nexus-ai/history` - Clear chat history for current user

## Important Notes

- Chat history is stored **per user** - each user only sees their own messages
- The OpenAI API key is configured and messages are sent to GPT-4.1 Nano
- Data sent to OpenAI is **not used for training** (per OpenAI policy since March 1, 2023)
- The feature includes proper error handling and loading states
- All database operations use the service role key for reliability

## File Changes

### New Files
- `app/api/nexus-ai/chat/route.ts` - Chat API with DB persistence
- `app/api/nexus-ai/history/route.ts` - History loading/clearing API
- `app/dashboard/nexus-ai/page.tsx` - Chat UI component
- `supabase/migrations/20240126000000_create_nexus_ai_chat_history.sql` - DB migration

### Modified Files
- `components/layout/DashboardLayout.tsx` - Added Nexus AI navigation item
- `.env.local` - Added OpenAI API key

## Next Steps

1. ✅ Apply the database migration
2. ✅ Test the chat functionality
3. ✅ Verify chat history persists across page refreshes
4. ✅ Test the clear chat functionality

---

**Status:** Ready for testing after migration is applied
**Migration Required:** Yes - see instructions above
