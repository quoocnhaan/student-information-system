import { useState } from "react";
import {
  TrendingUp,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers,
  Star,
  BookOpen,
  Target,
  CheckCircle,
} from "lucide-react";

const programData = [
  {
    id: "general",
    title: "Kiến thức giáo dục đại cương",
    status: "Đạt",
    requirementText: "KT giáo dục đại cương - PM231",
    unitsRequired: 12.0,
    unitsTaken: 12.0,
    unitsNeeded: 0.0,
    coursesRequired: 4,
    coursesTaken: 4,
    coursesNeeded: 0,
    courses: [
      {
        id: 21,
        course: "PL101",
        description: "Pháp luật đại cương",
        units: 3.0,
        when: "Học kỳ 1 (2023-2024)",
        grade: "A",
        status: "completed",
        score: 8.5,
      },
      {
        id: 22,
        course: "ML101",
        description: "Triết học Mác - Lênin",
        units: 3.0,
        when: "Học kỳ 1 (2023-2024)",
        grade: "B",
        status: "completed",
        score: 7.8,
      },
      {
        id: 23,
        course: "ML102",
        description: "Kinh tế chính trị Mác - Lênin",
        units: 3.0,
        when: "Học kỳ 2 (2023-2024)",
        grade: "A",
        status: "completed",
        score: 8.2,
      },
      {
        id: 24,
        course: "HCM101",
        description: "Tư tưởng Hồ Chí Minh",
        units: 3.0,
        when: "Học kỳ 1 (2024-2025)",
        grade: "A",
        status: "completed",
        score: 8.9,
      },
    ],
  },
  {
    id: "basic",
    title: "Kiến thức cơ sở - PM231",
    status: "Đạt",
    requirementText: "KT cơ sở - PM231",
    unitsRequired: 21.0,
    unitsTaken: 21.0,
    unitsNeeded: 0.0,
    coursesRequired: 7,
    coursesTaken: 7,
    coursesNeeded: 0,
    courses: [
      {
        id: 1,
        course: "IT101",
        description: "Lập trình hướng đối tượng",
        units: 3.5,
        when: "Học kỳ 1 (2024-2025)",
        grade: "A",
        status: "completed",
        score: 8.5,
      },
      {
        id: 2,
        course: "IT102",
        description: "Cấu trúc dữ liệu và giải thuật",
        units: 3.5,
        when: "Học kỳ 1 (2024-2025)",
        grade: "A",
        status: "completed",
        score: 8.7,
      },
      {
        id: 3,
        course: "IT103",
        description: "Cơ sở dữ liệu",
        units: 3.0,
        when: "Học kỳ 2 (2024-2025)",
        grade: "B",
        status: "completed",
        score: 7.8,
      },
      {
        id: 4,
        course: "IT104",
        description: "Mạng máy tính",
        units: 3.0,
        when: "Học kỳ 2 (2024-2025)",
        grade: "B",
        status: "completed",
        score: 7.2,
      },
      {
        id: 5,
        course: "IT105",
        description: "Hệ điều hành",
        units: 3.0,
        when: "Học kỳ 1 (2025-2026)",
        grade: "A",
        status: "completed",
        score: 8.8,
      },
      {
        id: 6,
        course: "IT106",
        description: "Phát triển web",
        units: 3.0,
        when: "Học kỳ 1 (2025-2026)",
        grade: "A",
        status: "completed",
        score: 8.8,
      },
      {
        id: 7,
        course: "IT107",
        description: "Trí tuệ nhân tạo",
        units: 3.0,
        when: "Học kỳ 1 (2025-2026)",
        grade: "C",
        status: "completed",
        score: 6.0,
      },
    ],
  },
  {
    id: "specialized_core",
    title: "Kiến thức chuyên sâu ngành chính (Bắt buộc) - PM231",
    status: "Chưa đạt",
    requirementText: "KT chuyên sâu NC (BB) - PM231",
    unitsRequired: 21.0,
    unitsTaken: 12.0,
    unitsNeeded: 9.0,
    coursesRequired: 7,
    coursesTaken: 4,
    coursesNeeded: 3,
    courses: [
      {
        id: 11,
        course: "IT207DE01",
        description: "Kiểm thử phần mềm",
        units: 3.0,
        when: "Học kỳ 1 (2025-2026)",
        grade: "B",
        status: "completed",
        score: 7.5,
      },
      {
        id: 12,
        course: "IT305DE01",
        description: "Thiết kế tương tác",
        units: 3.0,
        when: "Học kỳ 1 (2025-2026)",
        grade: "A",
        status: "completed",
        score: 9.0,
      },
      {
        id: 13,
        course: "MIS302DE01",
        description: "Phân tích hệ thống kinh doanh",
        units: 3.0,
        when: "",
        grade: "",
        status: "not_completed",
        score: null,
      },
      {
        id: 14,
        course: "SW210DE01",
        description: "Kỹ nghệ phần mềm",
        units: 3.0,
        when: "Học kỳ 2 (2024-2025)",
        grade: "B",
        status: "completed",
        score: 7.8,
      },
      {
        id: 15,
        course: "SW320DV01",
        description: "Phát triển dự án phần mềm",
        units: 3.0,
        when: "",
        grade: "",
        status: "not_completed",
        score: null,
      },
      {
        id: 16,
        course: "SW402DE01",
        description: "Kiến trúc phần mềm",
        units: 3.0,
        when: "Học kỳ 2 (2025-2026)",
        grade: "A",
        status: "completed",
        score: 8.9,
      },
      {
        id: 17,
        course: "SW403DE01",
        description: "Quản lý dự án phần mềm",
        units: 3.0,
        when: "",
        grade: "",
        status: "not_completed",
        score: null,
      },
    ],
  },
];

export default function StudyProgressPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    specialized_core: true,
  });

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#112440]">
              Tiến độ học tập
            </h1>
          </div>
          <p className="text-slate-500">
            Theo dõi tiến độ hoàn thành môn học, số tín chỉ và kết quả học tập
            của bạn trong từng học kỳ.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Tổng số môn học</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                7{" "}
                <span className="text-lg font-medium text-slate-400">/ 7</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Tổng số tín chỉ</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                21{" "}
                <span className="text-lg font-medium text-slate-400">/ 21</span>
              </h3>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <Star className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Điểm trung bình</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                3.26
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-auto">
            <span className="text-sm font-medium text-slate-500">
              Xếp loại:
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
              Giỏi
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div className="flex items-start gap-4 mb-2">
            <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Target className="w-7 h-7" />
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-1">Tổng số môn đạt</p>
              <h3 className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">
                6{" "}
                <span className="text-lg font-medium text-slate-400">/ 7</span>
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main layout: Table */}
      <div className="w-full">
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 text-lg">
                Chương trình đào tạo
              </h3>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-4">
            {programData.map((section) => {
              const isExpanded = expanded[section.id];
              return (
                <div
                  key={section.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Accordion Header */}
                  <div
                    className="flex items-center gap-2 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => toggleExpand(section.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-green-600" />
                    )}
                    <h4 className="font-bold text-slate-700 text-[15px]">
                      {section.title}
                    </h4>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="p-6 bg-white flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-[14px]">
                          <span
                            className={`font-bold ${
                              section.status === "Đạt"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {section.status}:{" "}
                          </span>
                          <span className="text-slate-700">
                            {section.requirementText}
                          </span>
                        </p>
                        <ul className="list-disc list-inside text-[14px] text-slate-700 ml-4">
                          <li>
                            Tín chỉ: {section.unitsRequired.toFixed(2)} yêu cầu,{" "}
                            {section.unitsTaken.toFixed(2)} đã tích lũy,{" "}
                            {section.unitsNeeded.toFixed(2)} còn thiếu
                          </li>
                          <li>
                            Môn học: {section.coursesRequired} yêu cầu,{" "}
                            {section.coursesTaken} đã học,{" "}
                            {section.coursesNeeded} còn thiếu
                          </li>
                        </ul>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm">
                              <th className="font-semibold py-4 px-6">
                                Mã môn
                              </th>
                              <th className="font-semibold py-4 px-6">
                                Tên môn học
                              </th>
                              <th className="font-semibold py-4 px-6 text-center">
                                Tín chỉ
                              </th>
                              <th className="font-semibold py-4 px-6">Học kỳ</th>
                              <th className="font-semibold py-4 px-6 text-center">
                                Điểm chữ
                              </th>
                              <th className="font-semibold py-4 px-6 text-center">
                                Điểm số
                              </th>
                              <th className="font-semibold py-4 px-6 text-center">
                                Trạng thái
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-[14px]">
                            {section.courses.map((course) => (
                              <tr
                                key={course.id}
                                className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="py-4 px-6 font-medium text-slate-700">
                                  {course.course}
                                </td>
                                <td className="py-4 px-6 text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium">
                                  {course.description}
                                </td>
                                <td className="py-4 px-6 text-center text-slate-600">
                                  {course.units.toFixed(2)}
                                </td>
                                <td className="py-4 px-6 text-slate-600">
                                  {course.when}
                                </td>
                                <td className="py-4 px-6 text-center  text-slate-800">
                                  {course.grade}
                                </td>
                                <td className="py-4 px-6 text-center  text-slate-800">
                                  {course.score !== null
                                    ? course.score.toFixed(1)
                                    : ""}
                                </td>
                                <td className="py-4 px-6 text-center">
                                  {course.status === "completed" && (
                                    <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
