-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Documents
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  category text NOT NULL DEFAULT 'General',
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','review_again')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates documents" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes documents" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX documents_user_created_idx ON public.documents (user_id, created_at DESC);
CREATE INDEX documents_user_file_idx ON public.documents (user_id, file_name, file_size);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Programming & DSA questions
CREATE TABLE public.programming_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  language text NOT NULL CHECK (language IN ('C','C++','Python','Java','DSA')),
  topic text,
  difficulty text NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy','Medium','Hard')),
  question text,
  answer text,
  explanation text,
  notes text,
  code text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','review_again')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programming_questions TO authenticated;
GRANT ALL ON public.programming_questions TO service_role;
ALTER TABLE public.programming_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads programming" ON public.programming_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts programming" ON public.programming_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates programming" ON public.programming_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes programming" ON public.programming_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX programming_user_created_idx ON public.programming_questions (user_id, created_at DESC);
CREATE INDEX programming_user_lang_idx ON public.programming_questions (user_id, language, difficulty);
CREATE TRIGGER programming_updated_at BEFORE UPDATE ON public.programming_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aptitude & HR questions
CREATE TABLE public.aptitude_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  category text NOT NULL CHECK (category IN ('Aptitude','Logical Reasoning','HR Interview')),
  topic text,
  difficulty text NOT NULL DEFAULT 'Easy' CHECK (difficulty IN ('Easy','Medium','Hard')),
  question text,
  answer text,
  explanation text,
  notes text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','review_again')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.aptitude_questions TO authenticated;
GRANT ALL ON public.aptitude_questions TO service_role;
ALTER TABLE public.aptitude_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads aptitude" ON public.aptitude_questions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts aptitude" ON public.aptitude_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates aptitude" ON public.aptitude_questions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes aptitude" ON public.aptitude_questions FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX aptitude_user_created_idx ON public.aptitude_questions (user_id, created_at DESC);
CREATE INDEX aptitude_user_cat_idx ON public.aptitude_questions (user_id, category, difficulty);
CREATE TRIGGER aptitude_updated_at BEFORE UPDATE ON public.aptitude_questions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Video tutorials
CREATE TABLE public.tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  category text NOT NULL DEFAULT 'General',
  source_type text NOT NULL CHECK (source_type IN ('youtube','link','upload')),
  url text,
  file_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  allow_download boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','review_again')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tutorials_source_ck CHECK (
    (source_type = 'upload' AND file_path IS NOT NULL) OR (source_type <> 'upload' AND url IS NOT NULL)
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorials TO authenticated;
GRANT ALL ON public.tutorials TO service_role;
ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads tutorials" ON public.tutorials FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts tutorials" ON public.tutorials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates tutorials" ON public.tutorials FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes tutorials" ON public.tutorials FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX tutorials_user_created_idx ON public.tutorials (user_id, created_at DESC);
CREATE TRIGGER tutorials_updated_at BEFORE UPDATE ON public.tutorials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Learning history
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  section text NOT NULL CHECK (section IN ('documents','programming','aptitude','tutorials')),
  item_id uuid,
  item_title text NOT NULL,
  action text NOT NULL CHECK (action IN ('created','updated','status','deleted','opened','restored')),
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads activity" ON public.activity_log FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes activity" ON public.activity_log FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX activity_user_created_idx ON public.activity_log (user_id, created_at DESC);