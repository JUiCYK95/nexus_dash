-- Create table for Nexus AI chat history
CREATE TABLE IF NOT EXISTS public.nexus_ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_nexus_ai_chat_history_user_id ON public.nexus_ai_chat_history(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_nexus_ai_chat_history_created_at ON public.nexus_ai_chat_history(created_at);

-- Enable RLS
ALTER TABLE public.nexus_ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read their own chat history
CREATE POLICY "Users can view their own chat history"
  ON public.nexus_ai_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can only insert their own chat messages
CREATE POLICY "Users can insert their own chat messages"
  ON public.nexus_ai_chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can only delete their own chat history
CREATE POLICY "Users can delete their own chat history"
  ON public.nexus_ai_chat_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_nexus_ai_chat_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_nexus_ai_chat_history_updated_at
  BEFORE UPDATE ON public.nexus_ai_chat_history
  FOR EACH ROW
  EXECUTE FUNCTION update_nexus_ai_chat_history_updated_at();

-- Add comment to table
COMMENT ON TABLE public.nexus_ai_chat_history IS 'Stores chat history for Nexus AI per user';
