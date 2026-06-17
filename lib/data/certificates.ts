export type CertificateCourseCandidate = {
  id: string;
  totalVideos: number;
};

export type CertificateCountByCourse = Map<string, number>;

export function isCourseCompleteFromCounts(input: {
  totalUnits: number;
  completedUnits: number;
}) {
  return input.totalUnits > 0 && input.completedUnits >= input.totalUnits;
}

export function getMissingCertificateCourseIds(input: {
  courses: CertificateCourseCandidate[];
  chapterCountByCourse: CertificateCountByCourse;
  completedVideoCountByCourse: CertificateCountByCourse;
  completedChapterCountByCourse: CertificateCountByCourse;
  certifiedCourseIds: Set<string>;
}) {
  const {
    courses,
    chapterCountByCourse,
    completedVideoCountByCourse,
    completedChapterCountByCourse,
    certifiedCourseIds,
  } = input;

  return courses
    .filter((course) => {
      if (certifiedCourseIds.has(course.id)) return false;
      const chapterCount = chapterCountByCourse.get(course.id) ?? 0;
      const isChapterCourse = course.totalVideos === 1 && chapterCount > 0;
      const totalUnits = isChapterCourse ? chapterCount : course.totalVideos;
      const completedUnits = isChapterCourse
        ? completedChapterCountByCourse.get(course.id) ?? 0
        : completedVideoCountByCourse.get(course.id) ?? 0;

      return isCourseCompleteFromCounts({ totalUnits, completedUnits });
    })
    .map((course) => course.id);
}
