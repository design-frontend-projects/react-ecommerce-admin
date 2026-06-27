import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const dirFile = path.join(dir, file)
    const dirent = fs.statSync(dirFile)
    if (dirent.isDirectory()) {
      filelist = walkSync(dirFile, filelist)
    } else {
      if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
        filelist.push(dirFile)
      }
    }
  }
  return filelist
}

const files = walkSync('./src')
let count = 0

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  if (content.includes('@clerk/clerk-react')) {
    const updated = content.replace(/['"]@clerk\/clerk-react['"]/g, "'@/hooks/use-auth'")
    fs.writeFileSync(file, updated)
    count++
  }
}
console.log('Updated ' + count + ' files.')
