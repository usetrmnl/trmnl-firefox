#!/usr/bin/env ruby

output_xpi = "trmnl-firefox.xpi"

EXCLUDE = %w[
  .git
  .DS_Store
  trmnl-firefox.xpi
  pack.rb
  README.md
].freeze

File.delete(output_xpi) if File.exist?(output_xpi)

files = Dir["**/*"].select do |file|
  File.file?(file) && EXCLUDE.none? { |pattern| file == pattern || file.start_with?("#{pattern}/") }
end

system("zip", "-q", output_xpi, *files, exception: true)

puts "Created: #{output_xpi}"
