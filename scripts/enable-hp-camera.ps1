#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$matches = @(Get-PnpDevice -Class Camera | Where-Object FriendlyName -eq 'HP HD Camera')
if ($matches.Count -ne 1) {
  throw "Expected exactly one HP HD Camera, found $($matches.Count)."
}
$cameraId = $matches[0].InstanceId
$device = Get-PnpDevice -InstanceId $cameraId

if ($device.Status -ne 'OK') {
  Enable-PnpDevice -InstanceId $cameraId -Confirm:$false
}

$device = Get-PnpDevice -InstanceId $cameraId
if ($device.Status -ne 'OK') {
  throw "HP HD Camera did not enable. Current status: $($device.Status)"
}
