const { SessionMaterial, Session, Teacher, Class } = require('../models');
const { Op } = require('sequelize');

const uploadMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, file_url } = req.body;

    // Only URL is supported for file upload
    if (!file_url) {
      return res.status(400).json({
        success: false,
        message: 'file_url is required',
      });
    }

    const finalFileUrl = file_url;
    let fileType = null;
    const fileSize = null;

    // Try to extract file type from URL
    const urlParts = file_url.split('.');
    if (urlParts.length > 1) {
      fileType = urlParts[urlParts.length - 1].toLowerCase();
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

const getMaterialsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    // Verify class exists
    const classData = await Class.findByPk(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
      });
    }

    // Get all sessions for this class with materials
    const sessions = await Session.findAll({
      where: { class_id: classId },
      include: [
        {
          model: SessionMaterial,
          as: 'materials',
          separate: true,
          order: [['created_at', 'DESC']],
        },
      ],
      order: [['date', 'DESC']],
    });

    // Format response - include all sessions, even if they have no materials
    const materialsBySession = sessions.map(session => ({
      session_id: session.session_id,
      session_date: session.date,
      session_topic: session.topic,
      session_number: session.session_number,
      session_room: session.room,
      materials: (session.materials || []).map(material => ({
        material_id: material.material_id,
        name: material.name,
        file_url: material.file_url,
        file_type: material.file_type,
        file_size: material.file_size,
        created_at: material.created_at,
      })),
    }));

    res.json({
      success: true,
      data: materialsBySession,
    });
  } catch (error) {
    console.error('Get materials by class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  uploadMaterial,
  deleteMaterial,
  getMaterialsByClass,
};
