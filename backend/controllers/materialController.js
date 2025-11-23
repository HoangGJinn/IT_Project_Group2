const { SessionMaterial, Session, Teacher } = require('../models');

const uploadMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_url } = req.body;

    // Check if file is uploaded via multer or URL is provided
    let finalFileUrl = file_url;
    let fileType = null;
    let fileSize = null;

    if (req.file) {
      // File uploaded via multer
      finalFileUrl = `/uploads/${req.file.filename}`;
      fileType = req.file.mimetype;
      fileSize = req.file.size;
    } else if (!file_url) {
      return res.status(400).json({
        success: false,
        message: 'File or file_url is required',
      });
    } else {
      // URL provided, try to extract file type from URL
      const urlParts = file_url.split('.');
      if (urlParts.length > 1) {
        fileType = urlParts[urlParts.length - 1].toLowerCase();
      }
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });

    const material = await SessionMaterial.create({
      session_id: id,
      name,
      file_url: finalFileUrl,
      file_type: fileType,
      file_size: fileSize,
      uploaded_by: teacher?.teacher_id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: material,
    });
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;

    const material = await SessionMaterial.findByPk(id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    await material.destroy();

    res.json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  uploadMaterial,
  deleteMaterial,
};
