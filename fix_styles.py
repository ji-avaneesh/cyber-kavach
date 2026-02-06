
import re
import os

index_path = r'c:\Users\HP\Desktop\app\fire kavach\index.html'
css_path = r'c:\Users\HP\Desktop\app\fire kavach\css\style.css'

with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all style blocks
# We expect 3 blocks in the body
# Regex to capture style blocks
style_blocks = list(re.finditer(r'<style>(.*?)</style>', content, re.DOTALL))

print(f"Found {len(style_blocks)} style blocks.")

new_css = "\n\n/* ================= CONSOLIDATED STYLES ================= */\n"

# We want to extract specific blocks that look like the ones we identified
# Block 1 starts with "/* Modern Pricing Section */"
# Block 2 starts with "/* Map Section Styles */"
# Block 3 starts with "/* Modern Footer Styles */"

blocks_to_remove = []

for match in style_blocks:
    css_content = match.group(1)
    if "Modern Pricing Section" in css_content or "Map Section Styles" in css_content or "Modern Footer Styles" in css_content:
        new_css += css_content + "\n"
        blocks_to_remove.append(match.span())

# Sort blocks by start index in reverse order to remove them safeley
blocks_to_remove.sort(key=lambda x: x[0], reverse=True)

new_html = content
for start, end in blocks_to_remove:
    new_html = new_html[:start] + new_html[end:]

# Write CSS
with open(css_path, 'a', encoding='utf-8') as f:
    f.write(new_css)

# Write HTML
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print("Moved styles to style.css and updated index.html")
