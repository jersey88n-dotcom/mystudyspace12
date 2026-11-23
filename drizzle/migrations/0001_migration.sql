CREATE POLICY "Owner reads own study files" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('study-documents','study-videos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner uploads own study files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('study-documents','study-videos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner updates own study files" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('study-documents','study-videos') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner deletes own study files" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('study-documents','study-videos') AND (storage.foldername(name))[1] = auth.uid()::text);