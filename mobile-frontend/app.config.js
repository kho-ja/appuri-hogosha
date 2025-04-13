require('dotenv').config();

module.exports = ({ config }) => {
    if (process.env.EAS_PROJECT_ID) {
        config.extra.eas.projectId = process.env.EAS_PROJECT_ID
    }

    return {
        ...config,
    };
};
