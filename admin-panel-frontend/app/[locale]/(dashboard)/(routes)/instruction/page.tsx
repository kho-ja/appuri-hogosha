'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import imageSrc from '@/public/assets/image.png';
import imageSrc2 from '@/public/assets/image (1).png';
import imageSrc3 from '@/public/assets/image (2).png';
import imageSrc4 from '@/public/assets/image (3).png';
import imageSrc6 from '@/public/assets/image (5).png';
import imageSrc7 from '@/public/assets/image (6).png';
import imageSrc8 from '@/public/assets/image (7).png';
import imageSrc9 from '@/public/assets/image (8).png';
import imageSrc10 from '@/public/assets/image (9).png';
import imageSrc11 from '@/public/assets/image (11).png';
import imageSrc12 from '@/public/assets/image (10).png';
import imageSrc13 from '@/public/assets/image (12).png';
import imageSrc14 from '@/public/assets/image (13).png';
import imageSrc15 from '@/public/assets/image (14).png';
import imageSrc16 from '@/public/assets/image (15).png';
import imageSrc17 from '@/public/assets/image (16).png';
import imageSrc18 from '@/public/assets/image (17).png';
import imageSrc19 from '@/public/assets/image (18).png';
import React from 'react';
import DocsPreparing from '@/components/docsPreparing';
import localImageLoader from '@/lib/localImageLoader';

export default function Instruction() {
  const t = useTranslations('Instruction');
  const locale = useLocale(); // Store the locale in a variable for comparison

  if (locale === 'ja') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <h1 className="text-3xl w-2/4 font-bold">{t('Instruction')}</h1>
        </div>
        <DocsPreparing />

        <h2 className="text-2xl font-bold mb-6">
          {t('How to Download CSV Files')}
        </h2>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {t('1 From Microsoft Excel')}
            </h2>
          </CardHeader>
          <CardContent className="mb-8">
            <p className="text-lg">
              {t('To download a CSV file from Microsoft Excel:')}
            </p>
            <ol className="list-decimal ml-8 mt-2">
              <li>{t('Open your Excel file')}</li>
              <li>
                {t('Click on')} <strong>{t('File')}</strong>{' '}
                {t('in the top menu')}
              </li>
              <li>
                {t('Select')} <strong>{t('Save As')}</strong>.
              </li>
              <li>
                {t('Choose')}{' '}
                <strong>{t('CSV (Comma delimited) (*csv)')}</strong>{' '}
                {t('from the dropdown')}
              </li>
              <li>
                {t('Click')} <strong>{t('Save')}</strong>.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {t('2 From Google Sheets')}
            </h2>
          </CardHeader>
          <CardContent className="mb-8">
            <p className="text-lg">
              {t('To download a CSV file from Google Sheets:')}
            </p>
            <ol className="list-decimal ml-8 mt-2 space-y-4">
              <li className="mb-6">{t('Open your Google Sheet')}</li>
              <Image
                loader={localImageLoader}
                src={imageSrc10}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Click on')} <strong>{t('File')}</strong>{' '}
                {t('in the top menu')}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc11}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Hover over')} <strong>{t('Download')}</strong>{' '}
                {t('and select')}{' '}
                <strong>{t('Comma-separated values (csv)')}</strong>.
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc12}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Your file will automatically download')}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc4}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{t('3 From Kintone')}</h2>
          </CardHeader>
          <CardContent className="mb-8">
            <p className="text-lg">
              {t('To download a CSV file from Kintone:')}
            </p>
            <ol className="list-decimal ml-8 mt-2 space-y-4">
              <li className="mb-6">
                {t(
                  'Open your Kintone app and navigate to the records list view'
                )}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc16}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t("Click on the 'threedots' button and then click on the")}{' '}
                <strong>{t('Export')}</strong> {t('button')}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc17}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Select')} <strong>{t('Export')}</strong>.
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc18}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t(
                  'Your file will automatically download And you will see the list of exported files'
                )}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc19}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (locale === 'ru') {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <h1 className="text-3xl w-2/4 font-bold">{t('Instruction')}</h1>
        </div>
        <DocsPreparing />

        <h2 className="text-2xl font-bold mb-6">
          {t('How to Download CSV Files')}
        </h2>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {t('1 From Microsoft Excel')}
            </h2>
          </CardHeader>
          <CardContent className="mb-8">
            <p className="text-lg">
              {t('To download a CSV file from Microsoft Excel:')}
            </p>
            <ol className="list-decimal ml-8 mt-2">
              <li>{t('Open your Excel file')}</li>
              <li>
                {t('Click on')} <strong>{t('File')}</strong>{' '}
                {t('in the top menu')}
              </li>
              <li>
                {t('Select')} <strong>{t('Save As')}</strong>.
              </li>
              <li>
                {t('Choose')}
                <strong>{t('CSV (Comma delimited) (*csv)')}</strong>{' '}
                {t('from the dropdown')}
              </li>
              <li>
                {t('Click')} <strong>{t('Save')}</strong>.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">
              {t('2 From Google Sheets')}
            </h2>
          </CardHeader>
          <CardContent className="mb-8">
            <p className="text-lg">
              {t('To download a CSV file from Google Sheets:')}
            </p>
            <ol className="list-decimal ml-8 mt-2 space-y-4">
              <li className="mb-6">{t('Open your Google Sheet')}</li>
              <Image
                loader={localImageLoader}
                src={imageSrc13}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Click on')} <strong>{t('File')}</strong>{' '}
                {t('in the top menu')}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc14}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Hover over')} <strong>{t('Download')}</strong>{' '}
                {t('and select')}
                <strong>{t('Comma-separated values (csv)')}</strong>.
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc15}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Your file will automatically download')}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc4}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">{t('3 From Kintone')}</h2>
          </CardHeader>
          <CardContent className="mb-8">
            <p className="text-lg">
              {t('To download a CSV file from Kintone:')}
            </p>
            <ol className="list-decimal ml-8 mt-2 space-y-4">
              <li className="mb-6">
                {t(
                  'Open your Kintone app and navigate to the records list view'
                )}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc6}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t("Click on the 'threedots' button and then click on the")}
                <strong>{t('Export')}</strong> {t('button')}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc7}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t('Select')} <strong>{t('Export')}</strong>.
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc8}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
              <li className="mb-6">
                {t(
                  'Your file will automatically download And you will see the list of exported files'
                )}
              </li>
              <Image
                loader={localImageLoader}
                src={imageSrc9}
                alt={t('Description')}
                width={400}
                className="mb-6"
              />
            </ol>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-3xl w-2/4 font-bold">{t('Instruction')}</h1>
      </div>

      <DocsPreparing />

      <h2 className="text-2xl font-bold mb-6">
        {t('How to Download CSV Files')}
      </h2>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">
            {t('1 From Microsoft Excel')}
          </h2>
        </CardHeader>
        <CardContent className="mb-8">
          <p className="text-lg">
            {t('To download a CSV file from Microsoft Excel:')}
          </p>
          <ol className="list-decimal ml-8 mt-2">
            <li>{t('Open your Excel file')}</li>
            <li>
              {t('Click on')} <strong>{t('File')}</strong>{' '}
              {t('in the top menu')}
            </li>
            <li>
              {t('Select')} <strong>{t('Save As')}</strong>.
            </li>
            <li>
              {t('Choose')} <strong>{t('CSV (Comma delimited) (*csv)')}</strong>{' '}
              {t('from the dropdown')}
            </li>
            <li>
              {t('Click')} <strong>{t('Save')}</strong>.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('2 From Google Sheets')}</h2>
        </CardHeader>
        <CardContent className="mb-8">
          <p className="text-lg">
            {t('To download a CSV file from Google Sheets:')}
          </p>
          <ol className="list-decimal ml-8 mt-2 space-y-4">
            <li className="mb-6">{t('Open your Google Sheet')}</li>
            <Image
              loader={localImageLoader}
              src={imageSrc}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
            <li className="mb-6">
              {t('Click on')} <strong>{t('File')}</strong>{' '}
              {t('in the top menu')}
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc2}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
            <li className="mb-6">
              {t('Hover over')} <strong>{t('Download')}</strong>{' '}
              {t('and select')}
              <strong>{t('Comma-separated values (csv)')}</strong>.
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc3}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
            <li className="mb-6">
              {t('Your file will automatically download')}
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc4}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{t('3 From Kintone')}</h2>
        </CardHeader>
        <CardContent className="mb-8">
          <p className="text-lg">{t('To download a CSV file from Kintone:')}</p>
          <ol className="list-decimal ml-8 mt-2 space-y-4">
            <li className="mb-6">
              {t('Open your Kintone app and navigate to the records list view')}
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc6}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
            <li className="mb-6">
              {t("Click on the 'threedots' button and then click on the")}
              <strong>{t('Export')}</strong> {t('button')}
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc7}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
            <li className="mb-6">
              {t('Select')} <strong>{t('Export')}</strong>.
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc8}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
            <li className="mb-6">
              {t(
                'Your file will automatically download And you will see the list of exported files'
              )}
            </li>
            <Image
              loader={localImageLoader}
              src={imageSrc9}
              alt={t('Description')}
              width={400}
              className="mb-6"
            />
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
