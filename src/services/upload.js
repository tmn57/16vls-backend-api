const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { uuid } = require('uuidv4')

const storage = multer.diskStorage({
  destination: './src/public/images/',
  filename: function (req, file, cb) {
    const newName = uuid() + path.extname(file.originalname)
    try {
      fs.appendFileSync('./convq.dat', '' + newName + '\n')
    } catch (error) {
      console.log(`add to sm img q maker error: `, error)
    }
    cb(null, newName)
  }
})

// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 200000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb)
  }
}).array('image', 5)

// Check File Type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png/
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  // Check mime
  const mimetype = filetypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb('Lỗi: chỉ hỗ trợ upload JPG và PNG!')
  }
}

module.exports = {
  upload
}
