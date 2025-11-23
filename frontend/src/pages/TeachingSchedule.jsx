import { useState } from 'react'

function TeachingSchedule() {
  const [currentWeek, setCurrentWeek] = useState(new Date())

  const daysOfWeek = [
    'Thứ 2',
    'Thứ 3',
    'Thứ 4',
    'Thứ 5',
    'Thứ 6',
    'Thứ 7',
    'Chủ Nhật',
  ]

  // Mock data - sẽ thay bằng API call sau
  const schedule = {
    0: [
      {
        subject: 'Lập Trình Web',
        classCode: 'auegfwo',
        room: 'A112',
        periods: '7->10',
        color: 'bg-blue-600',
      },
    ],
    1: [
      {
        subject: 'Lập Trình Web',
        classCode: 'auegfwo',
        room: 'A112',
        periods: '7->10',
        color: 'bg-red-600',
      },
    ],
    3: [
      {
        subject: 'Lập Trình Web',
        classCode: 'auegfwo',
        room: 'A112',
        periods: '7->10',
        color: 'bg-green-600',
      },
    ],
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  return (
    <div>
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-blue-600">
          Lịch Dạy Của Tôi
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            &lt;&lt;&lt;
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Hiện Tại
          </button>
          <button
            onClick={goToNextWeek}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            &gt;&gt;&gt;
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {daysOfWeek.map((day, index) => (
            <div
              key={index}
              className="p-4 text-center font-semibold bg-gray-50 border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {daysOfWeek.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className="min-h-[200px] p-2 border-r border-b border-gray-200 last:border-r-0"
            >
              {schedule[dayIndex]?.map((item, index) => (
                <div
                  key={index}
                  className={`${item.color} text-white p-3 rounded mb-2 text-sm`}
                >
                  <p className="font-semibold">Môn: {item.subject}</p>
                  <p>Mã lớp: {item.classCode}</p>
                  <p>Phòng: {item.room}</p>
                  <p>Tiết: {item.periods}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TeachingSchedule


