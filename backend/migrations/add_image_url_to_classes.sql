-- Add image_url column to classes table
-- Run this only if the column doesn't exist
-- Check first: SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'classes' AND COLUMN_NAME = 'image_url';

ALTER TABLE classes 
ADD COLUMN image_url VARCHAR(500) NULL COMMENT 'URL hình ảnh lớp học' AFTER name;

