#!/usr/bin/env ruby

require 'rubygems'
require 'zip'

if File.exist?('./extension.xpi')
  File.delete('./extension.xpi')
end

# Define paths
source_dir = './code'
output_zip = 'extension.zip'
output_xpi = 'extension.xpi'

# Delete old files if they exist
[output_zip, output_xpi].each { |f| File.delete(f) if File.exist?(f) }

# Create zip of contents inside ./code (not the folder itself)
Zip::File.open(output_zip, Zip::File::CREATE) do |zipfile|
  Dir[File.join(source_dir, '**', '**')].each do |file|
    zip_path = file.sub(/^#{Regexp.escape(source_dir)}\/?/, '')
    zipfile.add(zip_path, file)
  end
end

# Rename .zip to .xpi
File.rename(output_zip, output_xpi)

puts "Created: #{output_xpi}"
