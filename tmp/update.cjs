const fs = require('fs');

const files = [
  'src/features/chats/index.tsx',
  'src/features/dashboard/index.tsx',
  'src/features/errors/maintenance-error.tsx',
  'src/features/errors/not-found-error.tsx',
  'src/features/errors/unauthorized-error.tsx',
  'src/features/settings/index.tsx',
  'src/features/tasks/index.tsx',
  'src/features/users/index.tsx',
  'src/features/respos/pages/pos.tsx',
  'src/features/products/pages/products.tsx', 
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('LanguageSwitch')) {
      const themeSwitchImportRegex = /import \{ ThemeSwitch \} from '.*'/;
      content = content.replace(themeSwitchImportRegex, match => match + "\nimport { LanguageSwitch } from \"@/components/language-switch\"");
      
      content = content.replace(/<ThemeSwitch \/>/g, "<LanguageSwitch />\n          <ThemeSwitch />");
      
      fs.writeFileSync(file, content);
      console.log('Updated ' + file);
    }
  }
}
