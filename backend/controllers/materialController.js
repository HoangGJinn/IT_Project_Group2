const { SessionMaterial, Session, Teacher } = require('../models');

const uploadMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Handle file upload (multer)
    const { name, file_url, file_type, file_size } = req.body;

    if (!name || !file_url) {
      return res.status(400).json({
        success: false,
        message: 'Name and file_url are required'
      });
    }

    const teacher = await Teacher.findOne({ where: { user_id: req.user.user_id } });

    const material = await SessionMaterial.create({
      session_id: id,
      name,
      file_url,
      file_type,
      file_size,
      uploaded_by: teacher?.teacher_id || null
    });

    res.status(201).json({
      success: true,
      message: 'Material uploaded successfully',
      data: material
    });
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
        message: 'Material not found'
      });
    }

    await material.destroy();

    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  uploadMaterial,
  deleteMaterial
};

