'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import localImageLoader from '@/lib/localImageLoader';

export default function Instruction2() {
  const t = useTranslations('KintoneINstruction2');
  const fields = [
    'kintoneUrl',
    'kintoneToken',
    'given_name',
    'family_name',
    'email',
    'phone_number',
  ];

  const images = [
    { src: '/assets/portal_img3.png' },
    { src: '/assets/settings_new_icon.png' },
    { src: '/assets/api_token_img1.png' },
    { src: '/assets/api_token_img2.png' },
    { src: '/assets/api_token_03.png' },
    { src: '/assets/api_token_04.png' },
    { src: '/assets/fieldcode_img3.png' },
    { src: '/assets/fieldcode_img4.png' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-2.5">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      <Card className="p-5">
        <CardHeader>
          <h1 className="text-2xl font-medium">{t('docs')}</h1>
          <p>{t('description')}</p>
        </CardHeader>
        <CardContent>
          <h2 className="text-2xl">{t('subheading')}</h2>
          {fields.map(field => (
            <div key={field} className="space-y-2 mt-4">
              <span className="text-xl ">{t(`fields.${field}`)}</span>
              <ul>
                <li>
                  <b>{t('purpose')}</b>
                  {t(`p.${field}`)}
                </li>
                <li>
                  <b>{t('input')}</b>
                  {t(`i.${field}`)}
                </li>
                <li>
                  <b>{t('example')}</b>
                  {t(`e.${field}`)}
                </li>
                <li>
                  <b>{t('note')}</b>
                  {t(`n.${field}`)}
                </li>
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="p-5">
        <CardHeader>
          <h1 className="text-2xl font-medium">{t('stepsInKintone')}</h1>
          <p>{t('stepsDescription')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <h2>{t('openKintonePlatform')}</h2>
          <p>{t('portalDescription')}</p>
          <Image
            loader={localImageLoader}
            src={images[0].src}
            alt="portal_img3"
            width={400}
            height={300}
          />
          <p>{t('selectAppDescription')}</p>
          <h2 className="font-bold text-2xl">{t('generatingApiTokens')}</h2>
          <p>
            <b>1.</b>
            {t('clickAppSettingsIcon')}
          </p>
          <Image
            loader={localImageLoader}
            src={images[1].src}
            alt="settings_new_icon"
            width={200}
            height={100}
          />
          <p>
            <b>2.</b>
            {t('selectApiTokenTab')}
          </p>
          <p>
            <b>3.</b>
            {t('clickGenerateToken')}
          </p>
          <Image
            loader={localImageLoader}
            src={images[2].src}
            alt="api_token_img1"
            width={400}
            height={300}
          />
          <p>
            <b>4.</b>
            {t('selectPermissionsForToken')}
          </p>
          <Image
            loader={localImageLoader}
            src={images[3].src}
            alt="api_token_img2"
            width={400}
            height={300}
          />
          <Card className="max-w-[600px] bg-blue-100 dark:bg-gray-600">
            <CardHeader>
              <h3 className="text-2xl font-medium">{t('note')}</h3>
            </CardHeader>
            <CardContent>
              <span>{t('permissionsPrecedenceNote')}</span>
              <ul>
                <li>{t('permissionsForApp')}</li>
                <li>{t('permissionsForRecords')}</li>
                <li>{t('permissionsForFields')}</li>
              </ul>
            </CardContent>
          </Card>
          <p>
            <b>5.</b>
            {t('addNotesToToken')}
          </p>
          <Image
            loader={localImageLoader}
            src={images[4].src}
            alt="api_token_03"
            width={400}
            height={300}
          />
          <ul>
            <li>{t('resizeInputFieldNote')}</li>
            <li>{t('inputCharacterLimitNote')}</li>
          </ul>
          <p>
            <b>6.</b>
            {t('saveNotesIcon')}
          </p>
          <Image
            loader={localImageLoader}
            src={images[5].src}
            alt="api_token_04"
            width={400}
            height={300}
          />
          <p>
            <b>7.</b>
            {t('saveApiTokenSettings')}
          </p>
          <p>
            <b>8.</b>
            {t('updateAppSettings')}
          </p>
          <p>
            <b>9.</b>
            {t('confirmUpdateDialog')}
          </p>
          <p>
            <b>10.</b>
            {t('copyAndPasteToken')}
          </p>
        </CardContent>
      </Card>

      <Card className="p-5">
        <CardHeader>
          <h1 className="text-2xl font-medium">{t('howToGetFieldCodes')}</h1>
          <p>{t('stepsDescription')}</p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            <li>
              <b>1.</b>
              {t('clickAppSettingsIcon')}
            </li>
            <Image
              loader={localImageLoader}
              src={images[1].src}
              alt="settings_new_icon"
              width={200}
              height={100}
            />
            <li>
              <b>2.</b>
              {t('openFormTab')}
            </li>
            <li>
              <b>3.</b>
              {t('hoverOverFieldSettings')}
            </li>
            <Image
              loader={localImageLoader}
              src={images[6].src}
              alt="field_code_img3"
              width={200}
              height={100}
            />
            <li>
              <b>4.</b>
              {t('checkAndEditFieldCode')}
            </li>
            <Image
              loader={localImageLoader}
              src={images[7].src}
              alt="field_code_img4"
              width={600}
              height={800}
            />
            <li>
              <b>5.</b>
              {t('saveFormSettings')}
            </li>
            <li>
              <b>6.</b>
              {t('activateOrUpdateAppSettings')}
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
