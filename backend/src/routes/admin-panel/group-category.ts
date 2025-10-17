import { IController } from '../../utils/icontroller';
import { ExtendedRequest, verifyToken } from '../../middlewares/auth';
import express, { Response, Router } from 'express';
import DB from '../../utils/db-client';
import { isValidString, isValidId } from '../../utils/validate';

class GroupCategoryController implements IController {
    public router: Router = express.Router();

    constructor() {
        this.initRoutes();
    }

    initRoutes(): void {
        // CRUD routes for Group Categories
        this.router.post('/create', verifyToken, this.createGroupCategory);
        this.router.get('/list', verifyToken, this.getGroupCategories);
        this.router.get('/tree', verifyToken, this.getGroupCategoryTree);
        this.router.get('/:id', verifyToken, this.getGroupCategory);
        this.router.put('/:id', verifyToken, this.updateGroupCategory);
        this.router.delete('/:id', verifyToken, this.deleteGroupCategory);

        // Route to get groups within a category
        this.router.get('/:id/groups', verifyToken, this.getGroupsInCategory);
    }

    createGroupCategory = async (req: ExtendedRequest, res: Response) => {
        try {
            const { name, parent_category_id } = req.body;

            if (!name || !isValidString(name)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_category_name',
                };
            }

            // Validate parent category exists if provided
            if (parent_category_id) {
                if (!isValidId(parent_category_id)) {
                    throw {
                        status: 400,
                        message: 'invalid_parent_category_id',
                    };
                }

                const parentCategory = await DB.query(
                    `SELECT id FROM GroupCategory WHERE id = :id AND school_id = :school_id`,
                    {
                        id: parent_category_id,
                        school_id: req.user.school_id,
                    }
                );

                if (parentCategory.length === 0) {
                    throw {
                        status: 404,
                        message: 'parent_category_not_found',
                    };
                }
            }

            // Check if category name already exists in the same school and parent
            const existingCategory = await DB.query(
                `SELECT id FROM GroupCategory 
                 WHERE name = :name AND school_id = :school_id AND 
                 (parent_category_id = :parent_category_id OR (parent_category_id IS NULL AND :parent_category_id IS NULL))`,
                {
                    name: name,
                    school_id: req.user.school_id,
                    parent_category_id: parent_category_id || null,
                }
            );

            if (existingCategory.length > 0) {
                throw {
                    status: 400,
                    message: 'category_name_already_exists',
                };
            }

            const categoryInsert = await DB.execute(
                `INSERT INTO GroupCategory(name, school_id, parent_category_id, created_at)
                 VALUES (:name, :school_id, :parent_category_id, NOW())`,
                {
                    name: name,
                    school_id: req.user.school_id,
                    parent_category_id: parent_category_id || null,
                }
            );

            const categoryId = categoryInsert.insertId;

            return res
                .status(201)
                .json({
                    id: categoryId,
                    name: name,
                    parent_category_id: parent_category_id || null,
                    message: 'group_category_created_successfully',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    getGroupCategories = async (req: ExtendedRequest, res: Response) => {
        try {
            const categories = await DB.query(
                `SELECT 
                    gc.id, 
                    gc.name, 
                    gc.parent_category_id,
                    gc.created_at,
                    parent.name as parent_category_name,
                    COUNT(sg.id) as group_count
                 FROM GroupCategory gc
                 LEFT JOIN GroupCategory parent ON gc.parent_category_id = parent.id
                 LEFT JOIN StudentGroup sg ON sg.group_category_id = gc.id
                 WHERE gc.school_id = :school_id
                 GROUP BY gc.id, gc.name, gc.parent_category_id, gc.created_at, parent.name
                 ORDER BY gc.parent_category_id, gc.name`,
                {
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    categories: categories,
                })
                .end();
        } catch (e: any) {
            console.error(e);
            return res
                .status(500)
                .json({
                    error: 'internal_server_error',
                })
                .end();
        }
    };

    getGroupCategoryTree = async (req: ExtendedRequest, res: Response) => {
        try {
            const categories = await DB.query(
                `SELECT 
                    gc.id, 
                    gc.name, 
                    gc.parent_category_id,
                    gc.created_at,
                    COUNT(sg.id) as group_count
                 FROM GroupCategory gc
                 LEFT JOIN StudentGroup sg ON sg.group_category_id = gc.id
                 WHERE gc.school_id = :school_id
                 GROUP BY gc.id, gc.name, gc.parent_category_id, gc.created_at
                 ORDER BY gc.parent_category_id, gc.name`,
                {
                    school_id: req.user.school_id,
                }
            );

            // Build tree structure
            const categoryMap = new Map();
            const rootCategories: any[] = [];

            // Initialize all categories
            categories.forEach((category: any) => {
                categoryMap.set(category.id, {
                    ...category,
                    children: [],
                    groups: [],
                });
            });

            // Get groups for each category
            const groups = await DB.query(
                `SELECT 
                    sg.id, 
                    sg.name, 
                    sg.group_category_id, 
                    sg.created_at,
                    COUNT(gm.student_id) AS member_count
                 FROM StudentGroup sg
                 LEFT JOIN GroupMember gm ON gm.group_id = sg.id
                 WHERE sg.school_id = :school_id AND sg.group_category_id IS NOT NULL
                 GROUP BY sg.id, sg.name, sg.group_category_id, sg.created_at
                 ORDER BY sg.group_category_id, sg.name`,
                {
                    school_id: req.user.school_id,
                }
            );

            // Add groups to their categories
            groups.forEach((group: any) => {
                if (categoryMap.has(group.group_category_id)) {
                    categoryMap.get(group.group_category_id).groups.push({
                        ...group,
                        member_count: Number(group.member_count ?? 0),
                    });
                }
            });

            // Build parent-child relationships
            categories.forEach((category: any) => {
                if (category.parent_category_id) {
                    if (categoryMap.has(category.parent_category_id)) {
                        categoryMap
                            .get(category.parent_category_id)
                            .children.push(categoryMap.get(category.id));
                    }
                } else {
                    rootCategories.push(categoryMap.get(category.id));
                }
            });

            return res
                .status(200)
                .json({
                    tree: rootCategories,
                })
                .end();
        } catch (e: any) {
            console.error(e);
            return res
                .status(500)
                .json({
                    error: 'internal_server_error',
                })
                .end();
        }
    };

    getGroupCategory = async (req: ExtendedRequest, res: Response) => {
        try {
            const categoryId = req.params.id;

            if (!categoryId || !isValidId(categoryId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_category_id',
                };
            }

            const category = await DB.query(
                `SELECT 
                    gc.id, 
                    gc.name, 
                    gc.parent_category_id,
                    gc.created_at,
                    parent.name as parent_category_name
                 FROM GroupCategory gc
                 LEFT JOIN GroupCategory parent ON gc.parent_category_id = parent.id
                 WHERE gc.id = :id AND gc.school_id = :school_id`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            if (category.length === 0) {
                throw {
                    status: 404,
                    message: 'category_not_found',
                };
            }

            // Get child categories
            const childCategories = await DB.query(
                `SELECT id, name, created_at
                 FROM GroupCategory
                 WHERE parent_category_id = :id AND school_id = :school_id
                 ORDER BY name`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            // Get groups in this category
            const groups = await DB.query(
                `SELECT id, name, created_at
                 FROM StudentGroup
                 WHERE group_category_id = :id AND school_id = :school_id
                 ORDER BY name`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    category: {
                        ...category[0],
                        child_categories: childCategories,
                        groups: groups,
                    },
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    updateGroupCategory = async (req: ExtendedRequest, res: Response) => {
        try {
            const categoryId = req.params.id;
            const { name, parent_category_id } = req.body;

            if (!categoryId || !isValidId(categoryId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_category_id',
                };
            }

            // Check if category exists
            const existingCategory = await DB.query(
                `SELECT id, name, parent_category_id FROM GroupCategory 
                 WHERE id = :id AND school_id = :school_id`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            if (existingCategory.length === 0) {
                throw {
                    status: 404,
                    message: 'category_not_found',
                };
            }

            const updates: any = {};
            const params: any = {
                id: categoryId,
                school_id: req.user.school_id,
            };

            // Validate and prepare updates
            if (name !== undefined) {
                if (!isValidString(name)) {
                    throw {
                        status: 400,
                        message: 'invalid_category_name',
                    };
                }

                // Check if new name conflicts
                const nameConflict = await DB.query(
                    `SELECT id FROM GroupCategory 
                     WHERE name = :name AND school_id = :school_id AND id != :id AND 
                     (parent_category_id = :parent_category_id OR (parent_category_id IS NULL AND :parent_category_id IS NULL))`,
                    {
                        name: name,
                        school_id: req.user.school_id,
                        id: categoryId,
                        parent_category_id:
                            parent_category_id !== undefined
                                ? parent_category_id
                                : existingCategory[0].parent_category_id,
                    }
                );

                if (nameConflict.length > 0) {
                    throw {
                        status: 400,
                        message: 'category_name_already_exists',
                    };
                }

                updates.name = name;
                params.name = name;
            }

            if (parent_category_id !== undefined) {
                if (parent_category_id && !isValidId(parent_category_id)) {
                    throw {
                        status: 400,
                        message: 'invalid_parent_category_id',
                    };
                }

                // Prevent circular references
                if (parent_category_id) {
                    if (parent_category_id.toString() === categoryId) {
                        throw {
                            status: 400,
                            message: 'category_cannot_be_parent_of_itself',
                        };
                    }

                    // Check if the parent category exists
                    const parentCategory = await DB.query(
                        `SELECT id FROM GroupCategory WHERE id = :id AND school_id = :school_id`,
                        {
                            id: parent_category_id,
                            school_id: req.user.school_id,
                        }
                    );

                    if (parentCategory.length === 0) {
                        throw {
                            status: 404,
                            message: 'parent_category_not_found',
                        };
                    }

                    // Check for circular reference (more complex check)
                    const isDescendant = await this.checkIfDescendant(
                        categoryId,
                        parent_category_id,
                        req.user.school_id
                    );
                    if (isDescendant) {
                        throw {
                            status: 400,
                            message: 'circular_reference_detected',
                        };
                    }
                }

                updates.parent_category_id = parent_category_id;
                params.parent_category_id = parent_category_id || null;
            }

            // Build update query
            if (Object.keys(updates).length === 0) {
                throw {
                    status: 400,
                    message: 'no_valid_updates_provided',
                };
            }

            const updateFields = Object.keys(updates)
                .map(key => `${key} = :${key}`)
                .join(', ');

            await DB.execute(
                `UPDATE GroupCategory SET ${updateFields} WHERE id = :id AND school_id = :school_id`,
                params
            );

            return res
                .status(200)
                .json({
                    message: 'group_category_updated_successfully',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    deleteGroupCategory = async (req: ExtendedRequest, res: Response) => {
        try {
            const categoryId = req.params.id;

            if (!categoryId || !isValidId(categoryId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_category_id',
                };
            }

            // Check if category exists
            const existingCategory = await DB.query(
                `SELECT id FROM GroupCategory 
                 WHERE id = :id AND school_id = :school_id`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            if (existingCategory.length === 0) {
                throw {
                    status: 404,
                    message: 'category_not_found',
                };
            }

            // Check if category has child categories
            const childCategories = await DB.query(
                `SELECT id FROM GroupCategory WHERE parent_category_id = :id`,
                { id: categoryId }
            );

            if (childCategories.length > 0) {
                throw {
                    status: 400,
                    message: 'category_has_child_categories',
                };
            }

            // Check if category has groups
            const groupsInCategory = await DB.query(
                `SELECT id FROM StudentGroup WHERE group_category_id = :id`,
                { id: categoryId }
            );

            if (groupsInCategory.length > 0) {
                throw {
                    status: 400,
                    message: 'category_has_groups',
                };
            }

            await DB.execute(
                'DELETE FROM GroupCategory WHERE id = :id AND school_id = :school_id',
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    message: 'group_category_deleted_successfully',
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    getGroupsInCategory = async (req: ExtendedRequest, res: Response) => {
        try {
            const categoryId = req.params.id;

            if (!categoryId || !isValidId(categoryId)) {
                throw {
                    status: 400,
                    message: 'invalid_or_missing_category_id',
                };
            }

            // Check if category exists
            const category = await DB.query(
                `SELECT id, name FROM GroupCategory 
                 WHERE id = :id AND school_id = :school_id`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            if (category.length === 0) {
                throw {
                    status: 404,
                    message: 'category_not_found',
                };
            }

            const groups = await DB.query(
                `SELECT 
                    sg.id, 
                    sg.name, 
                    sg.created_at,
                    COUNT(gm.student_id) as member_count
                 FROM StudentGroup sg
                 LEFT JOIN GroupMember gm ON sg.id = gm.group_id
                 WHERE sg.group_category_id = :id AND sg.school_id = :school_id
                 GROUP BY sg.id, sg.name, sg.created_at
                 ORDER BY sg.name`,
                {
                    id: categoryId,
                    school_id: req.user.school_id,
                }
            );

            return res
                .status(200)
                .json({
                    category: category[0],
                    groups: groups,
                })
                .end();
        } catch (e: any) {
            if (e.status) {
                return res
                    .status(e.status)
                    .json({
                        error: e.message,
                    })
                    .end();
            } else {
                return res
                    .status(500)
                    .json({
                        error: 'internal_server_error',
                    })
                    .end();
            }
        }
    };

    private async checkIfDescendant(
        categoryId: string,
        potentialAncestorId: string,
        schoolId: number
    ): Promise<boolean> {
        const descendants = await DB.query(
            `WITH RECURSIVE category_tree AS (
                SELECT id, parent_category_id, 1 as level
                FROM GroupCategory 
                WHERE id = :category_id AND school_id = :school_id
                
                UNION ALL
                
                SELECT gc.id, gc.parent_category_id, ct.level + 1
                FROM GroupCategory gc
                INNER JOIN category_tree ct ON gc.parent_category_id = ct.id
                WHERE gc.school_id = :school_id AND ct.level < 10
            )
            SELECT id FROM category_tree WHERE id = :potential_ancestor_id`,
            {
                category_id: categoryId,
                school_id: schoolId,
                potential_ancestor_id: potentialAncestorId,
            }
        );

        return descendants.length > 0;
    }
}

export default GroupCategoryController;
