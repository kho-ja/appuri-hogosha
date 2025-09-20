import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from './ui/card';

export default function DocsPreparing() {
  const t = useTranslations('DocsPreparing');

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-bold mb-6">
          {t('PreparingDocumentation')}
        </h2>
      </CardHeader>
      <CardContent>
        <p className="mb-8">{t('BeforeStartingProcess')}</p>
        <ul className="mb-8">
          <li>
            {t('columns')}
            {t('forstudents')}
          </li>
          <li>
            {t('StudentsEmailAddress')}
            <strong>{t('email')}</strong>
          </li>
          <li>
            {t('StudentsPhoneNumber')}
            <strong>{t('phone_number')}</strong>
          </li>
          <li>
            {t('StudentsGivenName')}
            <strong>{t('given_name')}</strong>
          </li>
          <li>
            {t('StudentsFamilyName')}
            <strong>{t('family_name')}</strong>
          </li>
          <li>
            {t('StudentNumber')}
            <strong>{t('student_number')}</strong>
          </li>
        </ul>
        <ul className="mb-8">
          <li>
            {t('columns')}
            {t('forparents')}
          </li>
          <li>
            {t('ParentsEmailAddress')}
            <strong>{t('email')}</strong>
          </li>
          <li>
            {t('ParentsGivenName')}
            <strong>{t('given_name')}</strong>
          </li>
          <li>
            {t('ParentsFamilyName')}
            <strong>{t('family_name')}</strong>
          </li>
          <li>
            {t('ParentsPhoneNumber')}
            <strong>{t('phone_number')}</strong>
          </li>
        </ul>
        <ul className="mb-8">
          <li>
            {t('columns')}
            {t('foradmins')}
          </li>
          <li>
            {t('AdminsEmailAddress')}
            <strong>{t('email')}</strong>
          </li>
          <li>
            {t('AdminsGivenName')}
            <strong>{t('given_name')}</strong>
          </li>
          <li>
            {t('AdminsFamilyName')}
            <strong>{t('family_name')}</strong>
          </li>
          <li>
            {t('AdminsPhoneNumber')}
            <strong>{t('phone_number')}</strong>
          </li>
        </ul>

        <ul className="mb-8">
          <li>
            {t('columns')}
            {t('forposts')}
          </li>
          <li>
            {t('PostsTitle')}
            <strong>{t('title')}</strong>
          </li>
          <li>
            {t('PostsDescription')}
            <strong>{t('description')}</strong>
          </li>
          <li>
            {t('PostsPriority')}
            <strong>{t('priority')}</strong>
          </li>
          <li>
            {t('PostsGroupNames')}
            <strong>{t('group_names')}</strong>
          </li>
          <li>
            {t('PostsStudentNumbers')}
            <strong>{t('student_numbers')}</strong>
          </li>
        </ul>

        <p>{t('UseFormToCreateStudent')}</p>
      </CardContent>
    </Card>
  );
}
