// Shared multer utilities — consumed by routes that handle file uploads

export function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('只能上传图片文件'))
  }
  cb(null, true)
}
