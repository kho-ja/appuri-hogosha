import DB from './db-client';

export const syncronizePosts = async (parentId: number, studentId: number) => {
  const parentStudents = await DB.query(
    `SELECT student_id
                                           FROM StudentParent
                                           WHERE parent_id = :parent_id`,
    {
      parent_id: parentId,
    }
  );

  if (!parentStudents.find((ps: any) => ps.student_id === studentId)) return;

  const postStudents = await DB.query(
    `SELECT id
                                         FROM PostStudent
                                         WHERE student_id = :student_id`,
    {
      student_id: studentId,
    }
  );

  if (!postStudents.length) return;

  const postStudentIds = postStudents.map((ps: any) => ps.id);
  const existingPostStudentIds = await DB.query(
    `SELECT post_student_id
                                                   FROM PostParent
                                                   WHERE parent_id = :parent_id
                                                     AND post_student_id IN (:post_student_ids)`,
    {
      parent_id: parentId,
      post_student_ids: postStudentIds,
    }
  );
  const newPostStudentIds = postStudentIds.filter(
    (id: any) =>
      !existingPostStudentIds.find((ps: any) => ps.post_student_id === id)
  );

  console.log('newPostStudentIds: ', newPostStudentIds);
  console.log('existingPostStudentIds: ', existingPostStudentIds);

  if (newPostStudentIds.length) {
    const insertValues = newPostStudentIds
      .map((id: any) => `(${id}, ${parentId}, 1)`)
      .join(', ');
    await DB.query(`INSERT INTO PostParent (post_student_id, parent_id, push)
                        VALUES ${insertValues}`);
  }
};
